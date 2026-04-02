from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


LOW_RESOLUTION_PUBLIC_PREFIX = "/assets/items/art/Foulborn/LowResolution/"
UPSCALED_PUBLIC_PREFIX = "/assets/items/art/Foulborn/Upscaled/"
BASE_PUBLIC_PREFIX = "/assets/items/art/"


@dataclass(frozen=True)
class FoulbornEntry:
    base_name: str
    base_local_path: Path
    base_public_path: str
    foulborn_local_path: Path
    foulborn_public_path: str
    name: str
    relative_path: str
    upscaled_local_path: Path
    upscaled_public_path: str
    comparison_local_path: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build guided-luma upscaled Foulborn art and comparison strips.")
    parser.add_argument(
        "--foulborn-manifest",
        default="data/generated/foulborn-art-manifest.json",
        help="JSON manifest of downloaded Foulborn art.",
    )
    parser.add_argument(
        "--inventory-out",
        default="data/generated/foulborn-upscale-inventory.json",
        help="JSON inventory output path.",
    )
    parser.add_argument(
        "--upscaled-manifest-out",
        default="data/generated/foulborn-upscaled-art-manifest.json",
        help="JSON manifest mapping Foulborn names to upscaled public paths.",
    )
    parser.add_argument(
        "--comparison-root",
        default="tmp/upscaled_foulborn_comparison",
        help="Directory root for review comparison strips.",
    )
    parser.add_argument(
        "--upscaled-root",
        default="apps/web/public/assets/items/art/Foulborn/Upscaled",
        help="Directory root for generated upscaled images.",
    )
    parser.add_argument(
        "--art-root",
        default="apps/web/public/assets/items/art",
        help="Root item art directory used to resolve local asset paths.",
    )
    return parser.parse_args()


def ensure_empty_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def image_to_float_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image).astype(np.float32) / 255.0


def float_array_to_image(array: np.ndarray) -> Image.Image:
    clipped = np.clip(array * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(clipped, mode="RGBA")


def resize_rgba(image: Image.Image, size: tuple[int, int], interpolation: int) -> Image.Image:
    array = np.asarray(image)
    resized = cv2.resize(array, size, interpolation=interpolation)
    return Image.fromarray(resized, mode="RGBA")


def blur_map(channel_map: np.ndarray, sigma: float) -> np.ndarray:
    return cv2.GaussianBlur(channel_map, (0, 0), sigmaX=sigma, sigmaY=sigma)


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    rgb_u8 = np.clip(rgb * 255.0, 0, 255).astype(np.uint8)
    lab_u8 = cv2.cvtColor(rgb_u8, cv2.COLOR_RGB2LAB)
    return lab_u8.astype(np.float32) / 255.0


def lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    lab_u8 = np.clip(lab * 255.0, 0, 255).astype(np.uint8)
    rgb_u8 = cv2.cvtColor(lab_u8, cv2.COLOR_LAB2RGB)
    return rgb_u8.astype(np.float32) / 255.0


def build_guided_luma_variant(base_hr: np.ndarray, foulborn_image: Image.Image) -> Image.Image:
    naive_hr = image_to_float_array(resize_rgba(foulborn_image, (base_hr.shape[1], base_hr.shape[0]), cv2.INTER_LANCZOS4))
    base_lab = rgb_to_lab(base_hr[..., :3])
    naive_lab = rgb_to_lab(naive_hr[..., :3])

    base_l = base_lab[..., 0]
    blur_l = blur_map(base_l, sigma=1.15)
    detail_l = base_l - blur_l
    edge_l = np.abs(cv2.Laplacian(base_l, cv2.CV_32F, ksize=3))
    edge_mask = edge_l / max(float(edge_l.max()), 1e-6)
    alpha_mask = np.clip(base_hr[..., 3], 0.0, 1.0)
    detail_weight = alpha_mask * (0.55 + 0.45 * edge_mask)

    result_lab = naive_lab.copy()
    result_lab[..., 0] = np.clip(naive_lab[..., 0] + detail_l * detail_weight * 1.35, 0.0, 1.0)

    result = naive_hr.copy()
    result[..., :3] = lab_to_rgb(result_lab)
    result[..., 3] = np.maximum(base_hr[..., 3], naive_hr[..., 3])
    return float_array_to_image(result)


def save_comparison_strip(name: str, images: list[tuple[str, Image.Image]], destination: Path) -> None:
    title_height = 34
    label_height = 28
    margin = 12
    width = sum(image.width for _, image in images) + margin * (len(images) + 1)
    height = title_height + max(image.height for _, image in images) + margin * 2 + label_height

    canvas = Image.new("RGBA", (width, height), (12, 14, 20, 255))
    title_layer = Image.new("RGBA", (width, title_height), (0, 0, 0, 0))
    title_draw = ImageDraw.Draw(title_layer)
    title_draw.text((margin, 8), name, fill=(242, 244, 255, 255))
    canvas.alpha_composite(title_layer, (0, 0))

    x = margin
    y = title_height
    for label, image in images:
        canvas.alpha_composite(image, (x, y))
        text_layer = Image.new("RGBA", (image.width, label_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(text_layer)
        draw.text((0, 4), label, fill=(232, 236, 255, 255))
        canvas.alpha_composite(text_layer, (x, y + image.height + 4))
        x += image.width + margin

    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)


def build_entries(
    art_root: Path,
    upscaled_root: Path,
    comparison_root: Path,
    manifest_data: dict[str, str],
) -> list[FoulbornEntry]:
    entries: list[FoulbornEntry] = []

    for name, foulborn_public_path in sorted(manifest_data.items()):
        if not foulborn_public_path.startswith(LOW_RESOLUTION_PUBLIC_PREFIX):
            continue

        relative_path = foulborn_public_path[len(LOW_RESOLUTION_PUBLIC_PREFIX) :]
        base_public_path = f"{BASE_PUBLIC_PREFIX}{relative_path}"
        upscaled_public_path = f"{UPSCALED_PUBLIC_PREFIX}{relative_path}"

        entries.append(
            FoulbornEntry(
                base_name=name.removeprefix("Foulborn "),
                base_local_path=art_root / relative_path,
                base_public_path=base_public_path,
                foulborn_local_path=art_root / "Foulborn" / "LowResolution" / relative_path,
                foulborn_public_path=foulborn_public_path,
                name=name,
                relative_path=relative_path,
                upscaled_local_path=upscaled_root / relative_path,
                upscaled_public_path=upscaled_public_path,
                comparison_local_path=comparison_root / relative_path,
            ),
        )

    return entries


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    foulborn_manifest_path = repo_root / args.foulborn_manifest
    art_root = repo_root / args.art_root
    upscaled_root = repo_root / args.upscaled_root
    comparison_root = repo_root / args.comparison_root
    inventory_out_path = repo_root / args.inventory_out
    upscaled_manifest_out_path = repo_root / args.upscaled_manifest_out

    manifest_data = json.loads(foulborn_manifest_path.read_text(encoding="utf-8"))
    ensure_empty_dir(upscaled_root)
    ensure_empty_dir(comparison_root)

    entries = build_entries(art_root, upscaled_root, comparison_root, manifest_data)
    inventory: list[dict[str, object]] = []
    upscaled_manifest: dict[str, str] = {}

    generated_count = 0
    skipped_count = 0

    for entry in entries:
        status = "generated"
        if not entry.base_local_path.exists():
            status = "missing_base"
        elif not entry.foulborn_local_path.exists():
            status = "missing_foulborn"

        inventory_entry: dict[str, object] = {
            "name": entry.name,
            "baseName": entry.base_name,
            "relativePath": entry.relative_path,
            "basePublicPath": entry.base_public_path,
            "foulbornPublicPath": entry.foulborn_public_path,
            "upscaledPublicPath": entry.upscaled_public_path,
            "comparisonPath": str(entry.comparison_local_path.relative_to(repo_root)).replace("\\", "/"),
            "status": status,
        }

        if status != "generated":
            skipped_count += 1
            inventory.append(inventory_entry)
            continue

        base_image = load_rgba(entry.base_local_path)
        foulborn_image = load_rgba(entry.foulborn_local_path)
        guided_luma_image = build_guided_luma_variant(image_to_float_array(base_image), foulborn_image)

        entry.upscaled_local_path.parent.mkdir(parents=True, exist_ok=True)
        guided_luma_image.save(entry.upscaled_local_path)

        save_comparison_strip(
            entry.name,
            [
                ("Base HR", base_image),
                ("Base Foulborn", foulborn_image.resize(base_image.size, Image.Resampling.LANCZOS)),
                ("Guided Luma Upscaled", guided_luma_image),
            ],
            entry.comparison_local_path,
        )

        inventory_entry["baseSize"] = list(base_image.size)
        inventory_entry["foulbornSize"] = list(foulborn_image.size)
        inventory_entry["upscaledSize"] = list(guided_luma_image.size)
        inventory_entry["upscaledExists"] = True
        inventory.append(inventory_entry)
        upscaled_manifest[entry.name] = entry.upscaled_public_path
        generated_count += 1

    inventory_out_path.parent.mkdir(parents=True, exist_ok=True)
    inventory_out_path.write_text(f"{json.dumps(inventory, indent=2)}\n", encoding="utf-8")
    upscaled_manifest_out_path.parent.mkdir(parents=True, exist_ok=True)
    upscaled_manifest_out_path.write_text(f"{json.dumps(upscaled_manifest, indent=2)}\n", encoding="utf-8")

    print(f"Generated guided-luma upscaled Foulborn assets: {generated_count}")
    print(f"Skipped entries: {skipped_count}")
    print(f"Upscaled asset root: {upscaled_root}")
    print(f"Comparison strip root: {comparison_root}")
    print(f"Inventory written: {inventory_out_path}")
    print(f"Upscaled manifest written: {upscaled_manifest_out_path}")


if __name__ == "__main__":
    main()
