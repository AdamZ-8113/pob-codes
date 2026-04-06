import type { TimelessJewelType } from "../timeless-jewel-descriptor";

const INITIAL_STATE_CONSTANT_0 = 0x40336050;
const INITIAL_STATE_CONSTANT_1 = 0xcfa3723c;
const INITIAL_STATE_CONSTANT_2 = 0x3cac5f6f;
const INITIAL_STATE_CONSTANT_3 = 0x3793fdff;

const TINY_MT32_SH0 = 1;
const TINY_MT32_SH1 = 10;
const TINY_MT32_MASK = 0x7fffffff;
const TINY_MT32_ALPHA = 0x19660d;
const TINY_MT32_BRAVO = 0x5d588b65;

export class TimelessNumberGenerator {
  private readonly state = new Uint32Array(4);

  reset(passiveSkillGraphId: number, seed: number, jewelType: TimelessJewelType) {
    this.state[0] = INITIAL_STATE_CONSTANT_0;
    this.state[1] = INITIAL_STATE_CONSTANT_1;
    this.state[2] = INITIAL_STATE_CONSTANT_2;
    this.state[3] = INITIAL_STATE_CONSTANT_3;

    this.initialize([passiveSkillGraphId >>> 0, normalizeSeedForRng(seed, jewelType)]);
  }

  generateSingle(exclusiveMaximumValue: number) {
    if (!Number.isFinite(exclusiveMaximumValue) || exclusiveMaximumValue <= 0) {
      return 0;
    }

    return this.generateUInt() % (exclusiveMaximumValue >>> 0);
  }

  generate(minValue: number, maxValue: number) {
    const a = addU32(minValue >>> 0, 0x80000000);
    const b = addU32(maxValue >>> 0, 0x80000000);
    const roll = this.generateSingle(addU32(subU32(b, a), 1));
    return addU32(addU32(roll, a), 0x80000000);
  }

  private initialize(seeds: number[]) {
    let index = 1;

    for (const seed of seeds) {
      let roundState = manipulateAlpha(
        xor3(this.state[index % 4], this.state[(index + 1) % 4], this.state[(index + 3) % 4]),
      );

      this.state[(index + 1) % 4] = addU32(this.state[(index + 1) % 4], roundState);
      roundState = addU32(addU32(roundState, seed >>> 0), index);
      this.state[(index + 2) % 4] = addU32(this.state[(index + 2) % 4], roundState);
      this.state[index % 4] = roundState;
      index = (index + 1) % 4;
    }

    for (let iteration = 0; iteration < 5; iteration += 1) {
      let roundState = manipulateAlpha(
        xor3(this.state[index % 4], this.state[(index + 1) % 4], this.state[(index + 3) % 4]),
      );

      this.state[(index + 1) % 4] = addU32(this.state[(index + 1) % 4], roundState);
      roundState = addU32(roundState, index);
      this.state[(index + 2) % 4] = addU32(this.state[(index + 2) % 4], roundState);
      this.state[index % 4] = roundState;
      index = (index + 1) % 4;
    }

    for (let iteration = 0; iteration < 4; iteration += 1) {
      let roundState = manipulateBravo(
        addU32(addU32(this.state[index % 4], this.state[(index + 1) % 4]), this.state[(index + 3) % 4]),
      );

      this.state[(index + 1) % 4] = xorU32(this.state[(index + 1) % 4], roundState);
      roundState = subU32(roundState, index);
      this.state[(index + 2) % 4] = xorU32(this.state[(index + 2) % 4], roundState);
      this.state[index % 4] = roundState;
      index = (index + 1) % 4;
    }

    for (let iteration = 0; iteration < 8; iteration += 1) {
      this.generateNextState();
    }
  }

  private generateUInt() {
    this.generateNextState();
    return this.temper();
  }

  private generateNextState() {
    let a = this.state[3];
    let b = xor3(this.state[0] & TINY_MT32_MASK, this.state[1], this.state[2]);

    a = xorU32(a, (a << TINY_MT32_SH0) >>> 0);
    b = xorU32(b, xorU32(b >>> TINY_MT32_SH0, a));

    this.state[0] = this.state[1];
    this.state[1] = this.state[2];
    this.state[2] = xorU32(a, (b << TINY_MT32_SH1) >>> 0);
    this.state[3] = b;

    const mask = (0 - (b & 1)) >>> 0;
    this.state[1] = xorU32(this.state[1], mask & 0x8f7011ee);
    this.state[2] = xorU32(this.state[2], mask & 0xfc78ff1f);
  }

  private temper() {
    const b = addU32(this.state[0], this.state[2] >>> 8);
    const a = xorU32(this.state[3], b);
    return (b & 1) !== 0 ? xorU32(a, 0x3793fdff) : a;
  }
}

function normalizeSeedForRng(seed: number, jewelType: TimelessJewelType) {
  if (jewelType === "Elegant Hubris") {
    return Math.floor((seed >>> 0) / 20) >>> 0;
  }

  return seed >>> 0;
}

function manipulateAlpha(value: number) {
  return Math.imul(xorU32(value, value >>> 27), TINY_MT32_ALPHA) >>> 0;
}

function manipulateBravo(value: number) {
  return Math.imul(xorU32(value, value >>> 27), TINY_MT32_BRAVO) >>> 0;
}

function xor3(left: number, middle: number, right: number) {
  return xorU32(xorU32(left, middle), right);
}

function xorU32(left: number, right: number) {
  return (left ^ right) >>> 0;
}

function addU32(left: number, right: number) {
  return (left + right) >>> 0;
}

function subU32(left: number, right: number) {
  return (left - right) >>> 0;
}
