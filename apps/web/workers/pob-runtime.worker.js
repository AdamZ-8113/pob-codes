import * as Wasmoon from "wasmoon";
import { deflate, inflate, inflateRaw } from "pako";

const { LuaFactory } = Wasmoon;
const wasmUrl = "/browser-pob/wasmoon-glue.wasm";

function emit(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function emitLog(message) {
  emit("log", { message });
}

function emitStatus(payload) {
  emit("status", { payload });
}

function emitMetrics(payload) {
  emit("metrics", { payload });
}

function emitManifest(payload) {
  emit("manifest", { payload });
}

function emitResponse(id, ok, payload = {}) {
  emit("response", { id, ok, ...payload });
}

const state = {
  catalog: null,
  manifest: null,
  factory: null,
  luaModule: null,
  engine: null,
  mounted: false,
  booted: false,
  mountStats: null,
  bootStats: null,
  lastRun: null,
  lastXml: "",
  pending: false,
  lastSampleId: "",
  mountedFileKeys: new Set(),
  totalMountedBytes: 0,
  loadedTreeVersions: new Set(),
  timelessMounted: false,
  currentBuild: null,
  lastProfileCharacters: null,
  configBundle: null,
  skillsBundle: null,
  lastBuildLoad: null,
  lastConfigRecalc: null,
};

const DEFAULT_TREE_VERSION = "3_28";

const LUA_COMPAT_SCRIPT = String.raw`
arg = arg or {}
unpack = unpack or table.unpack
loadstring = loadstring or load
math.pow = math.pow or function(left, right)
  return left ^ right
end

do
  if math.__spike_numeric_string_compat ~= true then
    math.__spike_numeric_string_compat = true
    local original_math_min = math.min
    local original_math_max = math.max

    local function normalize_numeric_arg(value)
      if type(value) == "string" then
        local numericValue = tonumber(value)
        if numericValue ~= nil then
          return numericValue
        end
      end
      return value
    end

    local function normalize_numeric_args(...)
      local values = { ... }
      for index = 1, #values do
        values[index] = normalize_numeric_arg(values[index])
      end
      return table.unpack(values)
    end

    math.min = function(...)
      return original_math_min(normalize_numeric_args(...))
    end

    math.max = function(...)
      return original_math_max(normalize_numeric_args(...))
    end
  end
end

do
  local original_string_gsub = string.gsub
  local function normalize_replacement_string(value)
    local output = {}
    local index = 1

    while index <= #value do
      local current = string.sub(value, index, index)
      if current == "%" and index < #value then
        local nextChar = string.sub(value, index + 1, index + 1)
        if string.match(nextChar, "[%d%%]") then
          output[#output + 1] = current
          output[#output + 1] = nextChar
        else
          output[#output + 1] = nextChar
        end
        index = index + 2
      else
        output[#output + 1] = current
        index = index + 1
      end
    end

    return table.concat(output)
  end

  string.gsub = function(text, pattern, replacement, limit)
    if type(replacement) == "string" then
      replacement = normalize_replacement_string(replacement)
    end
    local result = { pcall(original_string_gsub, text, pattern, replacement, limit) }
    if result[1] then
      return result[2], result[3]
    end
    if __spike_js_log then
      local replacementText = type(replacement) == "string" and replacement or "<non-string replacement>"
      __spike_js_log("gsub error :: pattern=" .. tostring(pattern) .. " :: replacement=" .. replacementText)
      __spike_js_log("gsub text preview :: " .. tostring(text):sub(1, 160))
    end
    error(result[2])
  end
end

do
  local original_string_format = string.format
  local integer_specifiers = {
    c = true,
    d = true,
    i = true,
    o = true,
    u = true,
    x = true,
    X = true,
  }

  local function to_compat_integer(value)
    if value ~= value or value == math.huge or value == -math.huge then
      return 0
    end
    local integer = math.tointeger(value)
    if integer ~= nil then
      return integer
    end
    if value >= 0 then
      return math.floor(value)
    end
    return math.ceil(value)
  end

  local function args_to_string(values)
    local out = {}
    for index, value in ipairs(values) do
      out[#out + 1] = tostring(value)
    end
    return table.concat(out, " | ")
  end

  string.format = function(formatString, ...)
    local args = { ... }
    local argIndex = 1
    local cursor = 1

    while true do
      local startIndex = string.find(formatString, "%%", cursor, true)
      if not startIndex then
        break
      end

      local nextIndex = startIndex + 1
      local nextChar = string.sub(formatString, nextIndex, nextIndex)
      if nextChar == "%" then
        cursor = startIndex + 2
      else
        while nextIndex <= #formatString do
          local specifier = string.sub(formatString, nextIndex, nextIndex)
          if specifier == "*" then
            argIndex = argIndex + 1
          elseif string.match(specifier, "[A-Za-z]") then
            if integer_specifiers[specifier] and type(args[argIndex]) == "number" then
              args[argIndex] = to_compat_integer(args[argIndex])
            end
            argIndex = argIndex + 1
            cursor = nextIndex + 1
            break
          end
          nextIndex = nextIndex + 1
        end
      end
    end

    local formatted = { pcall(original_string_format, formatString, table.unpack(args)) }
    if formatted[1] then
      return formatted[2]
    end

    if tostring(formatted[2]):find("integer representation", 1, true) then
      local fallbackArgs = {}
      for index, value in ipairs(args) do
        fallbackArgs[index] = type(value) == "number" and to_compat_integer(value) or value
      end

      local fallback = { pcall(original_string_format, formatString, table.unpack(fallbackArgs)) }
      if fallback[1] then
        return fallback[2]
      end
      if __spike_js_log then
        __spike_js_log("format failure :: " .. tostring(formatString) .. " :: " .. args_to_string(args))
        __spike_js_log("format fallback failure :: " .. tostring(formatString) .. " :: " .. args_to_string(fallbackArgs))
      end
      error(fallback[2])
    end

    if __spike_js_log then
      __spike_js_log("format error :: " .. tostring(formatString) .. " :: " .. args_to_string(args))
    end
    error(formatted[2])
  end
end

if bit == nil then
  local function bit_norm(value)
    value = math.tointeger(value)
    if value == nil then
      value = math.floor(tonumber(value) or 0)
    end
    return value & 0xFFFFFFFF
  end

  local function bit_signed(value)
    value = bit_norm(value)
    if value >= 0x80000000 then
      return value - 0x100000000
    end
    return value
  end

  bit = {}

  function bit.tobit(value)
    return bit_signed(value)
  end

  function bit.band(...)
    local count = select("#", ...)
    if count == 0 then
      return -1
    end

    local result = 0xFFFFFFFF
    for index = 1, count do
      result = result & bit_norm(select(index, ...))
    end
    return bit_signed(result)
  end

  function bit.bor(...)
    local result = 0
    for index = 1, select("#", ...) do
      result = result | bit_norm(select(index, ...))
    end
    return bit_signed(result)
  end

  function bit.bxor(...)
    local result = 0
    for index = 1, select("#", ...) do
      result = result ~ bit_norm(select(index, ...))
    end
    return bit_signed(result)
  end

  function bit.bnot(value)
    return bit_signed(~bit_norm(value))
  end

  function bit.lshift(value, shift)
    return bit_signed(bit_norm(value) << (bit_norm(shift) & 31))
  end

  function bit.rshift(value, shift)
    return bit_signed((bit_norm(value) >> (bit_norm(shift) & 31)) & 0xFFFFFFFF)
  end
end

jit = jit or {}
jit.opt = jit.opt or {}
jit.opt.start = jit.opt.start or function(...)
  return true
end

if getfenv == nil or setfenv == nil then
  local function envlookup(func)
    local level = 1
    while true do
      local name, value = debug.getupvalue(func, level)
      if name == "_ENV" then
        return level, value
      end
      if name == nil then
        return nil
      end
      level = level + 1
    end
  end

  function getfenv(func)
    if type(func) == "number" then
      if func <= 0 then
        return _G
      end
      func = debug.getinfo(func + 1, "f").func
    end
    local _, env = envlookup(func)
    return env or _G
  end

  function setfenv(func, env)
    if type(func) == "number" then
      func = debug.getinfo(func + 1, "f").func
    end
    local level = envlookup(func)
    if level then
      debug.upvaluejoin(func, level, function()
        return env
      end, 1)
    end
    return func
  end
end

package.path = table.concat({
  "/pob/src/?.lua",
  "/pob/src/?/init.lua",
  "/pob/runtime/lua/?.lua",
  "/pob/runtime/lua/?/init.lua"
}, ";")
package.cpath = ""

package.preload["lua-utf8"] = package.preload["lua-utf8"] or function()
  local utf8lib = utf8 or {}
  return {
    reverse = string.reverse,
    gsub = string.gsub,
    find = string.find,
    sub = string.sub,
    match = string.match,
    next = function(text, position, direction)
      if direction == -1 then
        return utf8lib.offset and utf8lib.offset(text, -1, position) or nil
      end
      return utf8lib.offset and utf8lib.offset(text, 2, position) or nil
    end,
  }
end

do
  local file_search_methods = {}

  function file_search_methods:GetFileName()
    return self.matches[self.index]:match("([^/]+)$")
  end

  function file_search_methods:GetFileModifiedTime()
    return 1
  end

  function file_search_methods:NextFile()
    if self.index >= #self.matches then
      return nil
    end
    self.index = self.index + 1
    return true
  end

  NewFileSearch = function(pathPattern)
    local matches = {}
    if pathPattern:match("%.zip%.part%*$") then
      local prefix = pathPattern:gsub("%.part%*$", "")
      local part = 0
      while true do
        local candidate = prefix .. ".part" .. tostring(part)
        local file = io.open(candidate, "rb")
        if not file then
          break
        end
        file:close()
        matches[#matches + 1] = candidate
        part = part + 1
      end
    else
      local file = io.open(pathPattern, "rb")
      if file then
        file:close()
        matches[1] = pathPattern
      end
    end

    if #matches == 0 then
      return nil
    end

    return setmetatable({
      matches = matches,
      index = 1,
    }, { __index = file_search_methods })
  end
end

GetVirtualScreenSize = function()
  if GetScreenSize then
    return GetScreenSize()
  end
  return 1920, 1080
end

GetScriptPath = function()
  return "/pob/src"
end

GetRuntimePath = function()
  return "/pob/runtime"
end

GetUserPath = function()
  return "/pob/user"
end

GetWorkDir = function()
  return "/pob/src"
end
`;

const LUA_LOG_SCRIPT = String.raw`
local __spike_original_print = print
print = function(...)
  local parts = {}
  for i = 1, select("#", ...) do
    parts[#parts + 1] = tostring(select(i, ...))
  end
  __spike_js_log(table.concat(parts, "\t"))
  if __spike_original_print then
    __spike_original_print(...)
  end
end
`;

const LUA_HELPER_SCRIPT = String.raw`
local __spike_var_list = LoadModule("Modules/ConfigOptions")

local function __spike_json_escape(value)
  return tostring(value)
    :gsub("\\", "\\\\")
    :gsub("\"", "\\\"")
    :gsub("\n", "\\n")
    :gsub("\r", "\\r")
    :gsub("\t", "\\t")
end

local function __spike_is_array(value)
  if type(value) ~= "table" then
    return false
  end
  local maxIndex = 0
  for key in pairs(value) do
    if type(key) ~= "number" or key < 1 or key ~= math.floor(key) then
      return false
    end
    if key > maxIndex then
      maxIndex = key
    end
  end
  for index = 1, maxIndex do
    if value[index] == nil then
      return false
    end
  end
  return true
end

local function __spike_json_encode_value(value)
  local valueType = type(value)
  if value == nil then
    return "null"
  end
  if valueType == "boolean" then
    return value and "true" or "false"
  end
  if valueType == "number" then
    if value ~= value or value == math.huge or value == -math.huge then
      return "null"
    end
    return tostring(value)
  end
  if valueType == "string" then
    return "\"" .. __spike_json_escape(value) .. "\""
  end
  if valueType == "table" then
    local parts = {}
    if __spike_is_array(value) then
      for index = 1, #value do
        parts[#parts + 1] = __spike_json_encode_value(value[index])
      end
      return "[" .. table.concat(parts, ",") .. "]"
    end

    for key, entry in pairs(value) do
      parts[#parts + 1] = "\"" .. __spike_json_escape(key) .. "\":" .. __spike_json_encode_value(entry)
    end
    table.sort(parts)
    return "{" .. table.concat(parts, ",") .. "}"
  end
  return "null"
end

local function __spike_json_encode(value)
  return __spike_json_encode_value(value)
end

local function __spike_url_decode(value)
  return tostring(value or ""):gsub("%%(%x%x)", function(hex)
    return string.char(tonumber(hex, 16))
  end)
end

local function __spike_decode_config_entries(encoded)
  local decoded = {}
  for line in tostring(encoded or ""):gmatch("[^\n]+") do
    local key, kind, rawValue = line:match("([^\t]*)\t([^\t]*)\t(.*)")
    if key and kind then
      local entry = {
        key = __spike_url_decode(key),
        kind = kind,
      }
      if kind == "boolean" then
        entry.value = rawValue == "true"
      elseif kind == "number" then
        entry.value = tonumber(rawValue)
      elseif kind == "string" then
        entry.value = __spike_url_decode(rawValue)
      end
      decoded[#decoded + 1] = entry
    end
  end
  return decoded
end

local function __spike_strip_label(value)
  return tostring(value or "")
    :gsub("%^x[%x][%x][%x][%x][%x][%x]", "")
    :gsub("%^%d", "")
    :gsub("%s+", " ")
    :gsub(":$", "")
    :gsub("%?$", "")
    :gsub("^%s+", "")
    :gsub("%s+$", "")
end

local function __spike_capture_value(value)
  local valueType = type(value)
  if value == nil then
    return { kind = "unset" }
  end
  if valueType == "boolean" then
    return { kind = "boolean", value = value }
  end
  if valueType == "number" then
    if value ~= value or value == math.huge or value == -math.huge then
      return { kind = "unset" }
    end
    return { kind = "number", value = value }
  end
  return { kind = "string", value = tostring(value) }
end

local function __spike_capture_choice_value(value)
  local valueType = type(value)
  if valueType == "boolean" or valueType == "number" or valueType == "string" then
    return value
  end
  if value == nil then
    return nil
  end
  return tostring(value)
end

local function __spike_normalize_type(typeName)
  if typeName == "check" then
    return "check"
  end
  if typeName == "list" then
    return "list"
  end
  if typeName == "text" then
    return "text"
  end
  if typeName == "count" or typeName == "integer" or typeName == "countAllowZero" or typeName == "float" then
    return "number"
  end
  return tostring(typeName or "unknown")
end

local function __spike_is_same_captured_value(left, right)
  if not left or not right then
    return false
  end
  if left.kind ~= right.kind then
    return false
  end
  if left.kind == "unset" then
    return true
  end
  return left.value == right.value
end

local function __spike_export_choices(list)
  if type(list) ~= "table" then
    return nil
  end

  local out = {}
  for _, item in ipairs(list) do
    out[#out + 1] = {
      label = __spike_strip_label(item.label or item.val),
      value = __spike_capture_choice_value(item.val),
    }
  end
  return out
end

local __spike_var_data_by_key = nil

local function __spike_get_var_data(key)
  if __spike_var_data_by_key == nil then
    __spike_var_data_by_key = {}
    for _, varData in ipairs(__spike_var_list) do
      if varData.var then
        __spike_var_data_by_key[varData.var] = varData
      end
    end
  end
  return __spike_var_data_by_key[key]
end

local function __spike_is_number_config_type(typeName)
  return typeName == "count" or typeName == "integer" or typeName == "countAllowZero" or typeName == "float"
end

local function __spike_to_config_number(value)
  if type(value) == "number" then
    return value
  end
  if type(value) == "string" then
    return tonumber(value)
  end
  return nil
end

local function __spike_to_config_boolean(value)
  if type(value) == "boolean" then
    return value
  end
  if type(value) == "number" then
    return value ~= 0
  end
  if type(value) == "string" then
    local lowered = value:lower()
    if lowered == "true" or lowered == "1" then
      return true
    end
    if lowered == "false" or lowered == "0" or lowered == "" then
      return false
    end
  end
  return nil
end

local function __spike_normalize_list_config_value(varData, value)
  if type(varData.list) ~= "table" then
    return value
  end

  for _, item in ipairs(varData.list) do
    if item.val == value then
      return item.val
    end
  end

  for _, item in ipairs(varData.list) do
    if tostring(item.val) == tostring(value) then
      return item.val
    end
  end

  if type(value) == "number" and varData.list[value] then
    return varData.list[value].val
  end

  return value
end

local function __spike_coerce_config_value(varData, value)
  if not varData then
    return value
  end

  if varData.type == "check" then
    local booleanValue = __spike_to_config_boolean(value)
    if booleanValue ~= nil then
      return booleanValue
    end
    return value
  end

  if __spike_is_number_config_type(varData.type) then
    local numberValue = __spike_to_config_number(value)
    if numberValue ~= nil then
      return numberValue
    end
    return value
  end

  if varData.type == "list" then
    return __spike_normalize_list_config_value(varData, value)
  end

  if varData.type == "text" then
    return tostring(value or "")
  end

  return value
end

local function __spike_normalize_config_tab_state(configTab)
  if not configTab then
    return
  end

  for _, configSet in pairs(configTab.configSets or {}) do
    for key, value in pairs(configSet.input or {}) do
      configSet.input[key] = __spike_coerce_config_value(__spike_get_var_data(key), value)
    end
    for key, value in pairs(configSet.placeholder or {}) do
      configSet.placeholder[key] = __spike_coerce_config_value(__spike_get_var_data(key), value)
    end
  end

  for key, control in pairs(configTab.varControls or {}) do
    local varData = __spike_get_var_data(key)
    if control.state ~= nil then
      control.state = __spike_coerce_config_value(varData, control.state)
    end
    if control.placeholder ~= nil then
      control.placeholder = __spike_coerce_config_value(varData, control.placeholder)
    end
  end
end

local function __spike_get_socket_group_label(socketGroup, index)
  if not socketGroup then
    return "Socket Group " .. tostring(index or "?")
  end

  local label = socketGroup.displayLabel or socketGroup.label
  if label and tostring(label):match("%S") then
    return __spike_strip_label(label)
  end

  if socketGroup.slot and tostring(socketGroup.slot):match("%S") then
    return __spike_strip_label(socketGroup.slot)
  end

  return "Socket Group " .. tostring(index or "?")
end

local function __spike_get_socket_group_skill_list(socketGroup)
  if not socketGroup then
    return {}
  end

  return socketGroup.displaySkillListCalcs or socketGroup.displaySkillList or {}
end

local function __spike_export_active_skills(socketGroup)
  local out = {}
  local selectedIndex = socketGroup.mainActiveSkillCalcs or socketGroup.mainActiveSkill or 1

  for index, activeSkill in ipairs(__spike_get_socket_group_skill_list(socketGroup)) do
    local activeEffect = activeSkill and activeSkill.activeEffect or nil
    local grantedEffect = activeEffect and activeEffect.grantedEffect or nil
    local srcInstance = activeEffect and activeEffect.srcInstance or nil
    local parts = grantedEffect and grantedEffect.parts or nil

    out[#out + 1] = {
      index = index,
      label = __spike_strip_label(grantedEffect and grantedEffect.name or ("Skill " .. tostring(index))),
      selected = index == selectedIndex,
      partCount = parts and #parts or 0,
      isMine = activeSkill and activeSkill.skillFlags and activeSkill.skillFlags.mine or false,
      isMinion = activeSkill and activeSkill.minion ~= nil or false,
      isMultiStage = activeSkill and activeSkill.skillFlags and activeSkill.skillFlags.multiStage or false,
      skillPartCalcs = srcInstance and (srcInstance.skillPartCalcs or srcInstance.skillPart) or nil,
      skillStageCountCalcs = srcInstance and (srcInstance.skillStageCountCalcs or srcInstance.skillStageCount) or nil,
    }
  end

  return out
end

local function __spike_export_gems(socketGroup)
  local out = {}
  if not socketGroup or type(socketGroup.gemList) ~= "table" then
    return out
  end

  for index, gemInstance in ipairs(socketGroup.gemList) do
    local grantedEffect =
      gemInstance.grantedEffect
      or (gemInstance.gemData and gemInstance.gemData.grantedEffect)
      or (gemInstance.skillId and build and build.data and build.data.skills and build.data.skills[gemInstance.skillId])
      or nil
    local isSupport = grantedEffect and grantedEffect.support or false
    out[#out + 1] = {
      index = index,
      label = __spike_strip_label(gemInstance.nameSpec or (grantedEffect and grantedEffect.name) or ("Gem " .. tostring(index))),
      enabled = gemInstance.enabled ~= false,
      type = isSupport and "support" or "skill",
      isSupport = isSupport,
    }
  end

  return out
end

local function __spike_decode_skill_state(encoded)
  local decoded = {
    groups = {},
  }

  for line in tostring(encoded or ""):gmatch("[^\n]+") do
    local primaryIndex = line:match("^primary\t(.-)$")
    if primaryIndex ~= nil then
      decoded.primarySocketGroupIndex = tonumber(primaryIndex)
    else
      local groupIndex, fieldName, rawValue = line:match("^group\t([^\t]+)\t([^\t]+)\t(.*)$")
      if groupIndex and fieldName then
        local index = tonumber(groupIndex)
        if index then
          decoded.groups[index] = decoded.groups[index] or {
            gems = {},
          }
          if fieldName == "enabled" then
            decoded.groups[index].enabled = rawValue == "true"
          elseif fieldName == "includeInFullDPS" then
            decoded.groups[index].includeInFullDPS = rawValue == "true"
          elseif fieldName == "activeSkillIndex" then
            decoded.groups[index].activeSkillIndex = tonumber(rawValue)
          end
        end
      else
        local socketGroupIndex, gemIndex, gemFieldName, gemRawValue = line:match("^gem\t([^\t]+)\t([^\t]+)\t([^\t]+)\t(.*)$")
        local parsedGroupIndex = tonumber(socketGroupIndex)
        local parsedGemIndex = tonumber(gemIndex)
        if parsedGroupIndex and parsedGemIndex and gemFieldName then
          decoded.groups[parsedGroupIndex] = decoded.groups[parsedGroupIndex] or {
            gems = {},
          }
          decoded.groups[parsedGroupIndex].gems = decoded.groups[parsedGroupIndex].gems or {}
          decoded.groups[parsedGroupIndex].gems[parsedGemIndex] = decoded.groups[parsedGroupIndex].gems[parsedGemIndex] or {}
          if gemFieldName == "enabled" then
            decoded.groups[parsedGroupIndex].gems[parsedGemIndex].enabled = gemRawValue == "true"
          end
        end
      end
    end
  end

  return decoded
end

local function __spike_apply_skill_state(encoded)
  if not build or not build.skillsTab then
    return
  end

  local decoded = __spike_decode_skill_state(encoded)
  for groupIndex, groupState in pairs(decoded.groups or {}) do
    local socketGroup = build.skillsTab.socketGroupList[groupIndex]
    if socketGroup then
      if groupState.enabled ~= nil then
        socketGroup.enabled = groupState.enabled
      end
      if groupState.includeInFullDPS ~= nil then
        socketGroup.includeInFullDPS = groupState.includeInFullDPS
      end
      if groupState.activeSkillIndex and groupState.activeSkillIndex > 0 then
        socketGroup.mainActiveSkill = groupState.activeSkillIndex
        socketGroup.mainActiveSkillCalcs = groupState.activeSkillIndex
      end
      if type(groupState.gems) == "table" then
        for gemIndex, gemState in pairs(groupState.gems) do
          local gemInstance = socketGroup.gemList[gemIndex]
          if gemInstance and gemState.enabled ~= nil then
            gemInstance.enabled = gemState.enabled
          end
        end
      end
      build.skillsTab:ProcessSocketGroup(socketGroup)
    end
  end

  local primarySocketGroupIndex = tonumber(decoded.primarySocketGroupIndex)
  if primarySocketGroupIndex and primarySocketGroupIndex > 0 then
    build.mainSocketGroup = primarySocketGroupIndex
    if build.calcsTab and build.calcsTab.input then
      build.calcsTab.input.skill_number = primarySocketGroupIndex
    end
  end
end

function __spike_get_boot_summary_json()
  return __spike_json_encode({
    hasBuild = build ~= nil,
    latestTreeVersion = latestTreeVersion,
    buildMode = build and build.mode or nil,
  })
end

function __spike_get_launch_prompt_json()
  return __spike_json_encode(launch and launch.promptMsg or nil)
end

function __spike_get_output_summary_json()
  local output = build and build.calcsTab and build.calcsTab.mainOutput or {}
  local skillDpsCount = 0
  if output.SkillDPS then
    for _ in ipairs(output.SkillDPS) do
      skillDpsCount = skillDpsCount + 1
    end
  end

  return __spike_json_encode({
    Life = output.Life,
    Mana = output.Mana,
    EnergyShield = output.EnergyShield,
    Ward = output.Ward,
    Armour = output.Armour,
    Evasion = output.Evasion,
    FireResist = output.FireResist,
    ColdResist = output.ColdResist,
    LightningResist = output.LightningResist,
    ChaosResist = output.ChaosResist,
    FullDPS = output.FullDPS,
    FullDotDPS = output.FullDotDPS,
    SkillDpsCount = skillDpsCount,
  })
end

function __spike_get_output_key_count()
  local output = build and build.calcsTab and build.calcsTab.mainOutput or {}
  local count = 0
  for _ in pairs(output) do
    count = count + 1
  end
  return count
end

function __spike_export_current_build_xml()
  if not build then
    return nil
  end
  return build:SaveDB("spike.xml")
end

function __spike_get_active_config_preset_json()
  if not build or not build.configTab then
    return __spike_json_encode({ inputs = {} })
  end

  local configTab = build.configTab
  local input = configTab.configSets[configTab.activeConfigSetId].input
  local preset = {}

  for key, value in pairs(input) do
    local defaultValue = configTab:GetDefaultState(key, type(value))
    if value ~= defaultValue then
      preset[key] = value
    end
  end

  return __spike_json_encode({
    activeConfigSetId = configTab.activeConfigSetId,
    inputs = preset,
  })
end

function __spike_get_config_bundle_json()
  if not build or not build.configTab then
    return __spike_json_encode({
      activeConfigSetId = nil,
      sections = {},
      entries = {},
    })
  end

  local configTab = build.configTab
  configTab:UpdateControls()

  local sections = {}
  local entries = {}
  local currentSection = nil

  for _, varData in ipairs(__spike_var_list) do
    if varData.section then
      currentSection = {
        key = varData.section,
        title = varData.section,
        column = varData.col,
        controls = {},
      }
      sections[#sections + 1] = currentSection
    elseif varData.var then
      local control = configTab.varControls[varData.var]
      local currentValue = configTab.input[varData.var]
      local defaultValue = configTab:GetDefaultState(varData.var, type(currentValue))
      local entry = {
        key = varData.var,
        label = __spike_strip_label(varData.label or varData.var),
        rawLabel = varData.label,
        type = __spike_normalize_type(varData.type),
        rawType = varData.type,
        shown = control and control:IsShown() or false,
        currentValue = __spike_capture_value(currentValue),
        defaultValue = __spike_capture_value(defaultValue),
        placeholderValue = __spike_capture_value(configTab.placeholder[varData.var]),
        choices = __spike_export_choices(varData.list),
      }

      entries[varData.var] = entry
      if currentSection then
        currentSection.controls[#currentSection.controls + 1] = entry
      end
    end
  end

  return __spike_json_encode({
    activeConfigSetId = configTab.activeConfigSetId,
    sections = sections,
    entries = entries,
  })
end

function __spike_get_skills_bundle_json()
  if not build or not build.skillsTab then
    return __spike_json_encode({
      primarySocketGroupIndex = nil,
      socketGroups = {},
    })
  end

  local primarySocketGroupIndex =
    build.calcsTab and build.calcsTab.input and build.calcsTab.input.skill_number
    or build.mainSocketGroup
    or 1
  local socketGroups = {}

  for index, socketGroup in ipairs(build.skillsTab.socketGroupList or {}) do
    build.skillsTab:ProcessSocketGroup(socketGroup)
    socketGroups[#socketGroups + 1] = {
      index = index,
      label = __spike_get_socket_group_label(socketGroup, index),
      rawLabel = socketGroup.label,
      slot = socketGroup.slot,
      enabled = socketGroup.enabled ~= false,
      includeInFullDPS = socketGroup.includeInFullDPS and true or false,
      slotEnabled = socketGroup.slotEnabled ~= false,
      activeSkillIndex = socketGroup.mainActiveSkillCalcs or socketGroup.mainActiveSkill or 1,
      activeSkills = __spike_export_active_skills(socketGroup),
      gems = __spike_export_gems(socketGroup),
    }
  end

  return __spike_json_encode({
    primarySocketGroupIndex = primarySocketGroupIndex,
    socketGroups = socketGroups,
  })
end

function __spike_apply_build_adjustments_json(configEntriesJson, skillStateJson)
  if not build then
    error("Load a build first.")
  end

  if build.configTab then
    local decoded = __spike_decode_config_entries(configEntriesJson)
    local nextInput = {}

    for _, entry in ipairs(decoded or {}) do
      if entry and entry.key then
        if entry.kind == "boolean" or entry.kind == "number" or entry.kind == "string" then
          nextInput[entry.key] = __spike_coerce_config_value(__spike_get_var_data(entry.key), entry.value)
        end
      end
    end

    local activeConfigSet = build.configTab.configSets[build.configTab.activeConfigSetId]
    if activeConfigSet and activeConfigSet.input then
      for key in pairs(activeConfigSet.input) do
        activeConfigSet.input[key] = nil
      end
      for key, value in pairs(nextInput) do
        activeConfigSet.input[key] = value
      end
    end
    __spike_normalize_config_tab_state(build.configTab)
    build.configTab:UpdateControls()
    __spike_normalize_config_tab_state(build.configTab)
    build.configTab:BuildModList()
  end

  __spike_apply_skill_state(skillStateJson)
  build.buildFlag = true
  runCallback("OnFrame")

  if build.configTab then
    build.configTab:UpdateControls()
  end

  return "true"
end

function __spike_apply_config_entries_json(configEntriesJson)
  return __spike_apply_build_adjustments_json(configEntriesJson, "")
end
`;

function appendLog(message) {
  emitLog(message);
}

function setStatus(payload) {
  emitStatus(payload);
}

function setMetrics(payload) {
  emitMetrics(payload);
}

function setPending(isPending) {
  state.pending = isPending;
  emit("pending", { pending: isPending });
}

function formatBytes(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KiB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MiB`;
}

function fileKey(file) {
  return `${file.kind}:${file.sourcePath}`;
}

function sumFileSizes(files) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

function toBase64Url(input) {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeBuildCode(xml) {
  const bytes = new TextEncoder().encode(xml);
  return toBase64Url(deflate(bytes));
}

function inferBuildRequirements(xml) {
  const treeVersionMatch =
    xml.match(/\btreeVersion="([^"]+)"/i) ?? xml.match(/\blevelledTreeVersion="([^"]+)"/i);
  const treeVersion = treeVersionMatch?.[1] ?? DEFAULT_TREE_VERSION;
  const includeTimeless =
    /<TimelessData\b[^>]*(?:jewelTypeId|jewelSocketId|conquerorTypeId)=/i.test(xml) || /Timeless Jewel/i.test(xml);

  return {
    treeVersion,
    includeTimeless,
  };
}

function describeRequirements(requirements) {
  return `tree ${requirements.treeVersion}, timeless ${requirements.includeTimeless ? "yes" : "no"}`;
}

function usesTimelessJewelData(...inputs) {
  const text = inputs.filter(Boolean).join("\n");
  return /Timeless Jewel|Lethal Pride|Brutal Restraint|Elegant Hubris|Glorious Vanity|Militant Faith/i.test(text);
}

function shouldRetryWithTimelessData(error, requirements) {
  if (requirements.includeTimeless) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /Timeless Jewel data|DataLegionLookUpTableHelper|TimelessJewelData|LethalPride\.bin|BrutalRestraint\.bin|ElegantHubris\.bin|GloriousVanity\.bin|MilitantFaith\.bin/i.test(
    message,
  );
}

async function mountTimelessDataAndRetry(requirements) {
  const upgradedRequirements = {
    ...requirements,
    includeTimeless: true,
  };
  appendLog("Detected missing Timeless Jewel lookup data. Mounting Timeless data and retrying...");
  await mountRuntime({ requirements: upgradedRequirements });
  return upgradedRequirements;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed: ${response.status}`);
  }

  return data;
}

async function fetchJsonWithFallback(primaryUrl, fallbackUrl, label) {
  const primaryResponse = await fetch(primaryUrl, { cache: "no-store" });
  if (primaryResponse.ok) {
    return primaryResponse.json();
  }

  const fallbackResponse = await fetch(fallbackUrl, { cache: "no-store" });
  if (!fallbackResponse.ok) {
    throw new Error(`${label} request failed: ${primaryResponse.status}, fallback ${fallbackResponse.status}`);
  }

  return fallbackResponse.json();
}

async function fetchBinaryAsset(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function fetchManifest() {
  const catalog = await fetchJsonWithFallback(
    "/browser-pob/manifests/catalog.json",
    "/api/browser-pob/manifest",
    "Manifest",
  );
  state.catalog = catalog;
  emitManifest(catalog);

  setStatus({
    mounted: state.mounted,
    booted: state.booted,
    manifestGeneratedAt: catalog.generatedAt,
    supportedTreeVersions: catalog.supportedTreeVersions ?? [],
    strategy: catalog.notes?.strategy,
  });
}

async function fetchTargetedManifest(requirements) {
  const manifestName = `${requirements.treeVersion}${requirements.includeTimeless ? "-timeless" : ""}.json`;
  const fallbackUrl = new URL("/api/browser-pob/manifest", self.location.origin);
  fallbackUrl.searchParams.set("treeVersion", requirements.treeVersion);
  if (requirements.includeTimeless) {
    fallbackUrl.searchParams.set("timeless", "1");
  }

  return fetchJsonWithFallback(
    `/browser-pob/manifests/${encodeURIComponent(manifestName)}`,
    fallbackUrl,
    "Targeted manifest",
  );
}

async function fetchProfileCharacters({ realm, accountName, sessionId } = {}) {
  const result = await postJson("/api/poe/characters", {
    realm,
    accountName,
    sessionId,
  });
  state.lastProfileCharacters = result;
  return result;
}

async function fetchProfileCharacterImport({ realm, accountName, characterName, sessionId } = {}) {
  return postJson("/api/poe/import-character", {
    realm,
    accountName,
    characterName,
    sessionId,
  });
}

function ensureDirectory(fsApi, targetPath) {
  const parts = targetPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      fsApi.mkdir(current);
    } catch {
      // Already exists.
    }
  }
}

async function fetchMountFile(file) {
  if (file.compression === "zlib" && Array.isArray(file.urls)) {
    const compressedParts = await Promise.all(file.urls.map((url) => fetchBinaryAsset(url, file.sourcePath)));
    const compressed = concatUint8Arrays(compressedParts);
    try {
      return inflate(compressed);
    } catch {
      return inflateRaw(compressed);
    }
  }

  if (file.url) {
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${file.sourcePath}: ${response.status}`);
    }

    if (file.binary) {
      return new Uint8Array(await response.arrayBuffer());
    }

    return response.text();
  }

  const url = new URL("/api/browser-pob/file", self.location.origin);
  url.searchParams.set("kind", file.kind);
  url.searchParams.set("path", file.sourcePath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file.sourcePath}: ${response.status}`);
  }

  if (file.binary) {
    return new Uint8Array(await response.arrayBuffer());
  }

  return response.text();
}

async function mapLimit(items, limit, iteratee) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  }

  const workers = [];
  for (let index = 0; index < Math.min(limit, items.length); index += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

async function mountRuntime({ requirements } = {}) {
  if (!state.catalog) {
    await fetchManifest();
  }

  const resolvedRequirements = requirements ?? {
    treeVersion: DEFAULT_TREE_VERSION,
    includeTimeless: false,
  };

  const manifest = await fetchTargetedManifest(resolvedRequirements);
  state.manifest = manifest;

  if (!state.factory || !state.luaModule) {
    appendLog("Creating Wasmoon factory...");
    const factory = new LuaFactory(wasmUrl);

    const moduleStart = performance.now();
    const luaModule = await factory.getLuaModule();
    const moduleEnd = performance.now();
    const fsApi = luaModule.module.FS;
    ensureDirectory(fsApi, "/pob/src");
    ensureDirectory(fsApi, "/pob/user");
    ensureDirectory(fsApi, "/pob/runtime/lua");

    state.factory = factory;
    state.luaModule = luaModule;
    state.mountStats = {
      wasmInitMs: +(moduleEnd - moduleStart).toFixed(2),
    };
  }

  const filesToMount = state.manifest.mountFiles.filter((file) => !state.mountedFileKeys.has(fileKey(file)));
  const startupTreeVersion = state.manifest.notes?.startupTreeVersion;
  if (filesToMount.length === 0) {
    appendLog(`Runtime files already mounted for ${describeRequirements(resolvedRequirements)}.`);
    if (startupTreeVersion) {
      state.loadedTreeVersions.add(startupTreeVersion);
    }
    state.loadedTreeVersions.add(resolvedRequirements.treeVersion);
    state.timelessMounted ||= resolvedRequirements.includeTimeless;
    setStatus({
      mounted: state.mounted,
      booted: state.booted,
      notes: state.manifest.notes,
      loadedTreeVersions: Array.from(state.loadedTreeVersions).sort(),
      timelessMounted: state.timelessMounted,
    });
    return state.mountStats;
  }

  appendLog(
    `Mounting targeted runtime for ${describeRequirements(resolvedRequirements)}: ${filesToMount.length}/${state.manifest.mountFileCount} new files.`,
  );

  const fetchStart = performance.now();
  let mountedCount = 0;
  let mountedBytes = 0;

  const files = await mapLimit(filesToMount, 8, async (file, index) => {
    const content = await fetchMountFile(file);
    if ((index + 1) % 25 === 0 || index + 1 === filesToMount.length) {
      appendLog(`Fetched ${index + 1}/${filesToMount.length} targeted files...`);
    }
    return { file, content };
  });
  const fetchEnd = performance.now();

  const mountStart = performance.now();
  for (const entry of files) {
    ensureDirectory(state.luaModule.module.FS, entry.file.mountPath.split("/").slice(0, -1).join("/"));
    state.factory.mountFileSync(state.luaModule, entry.file.mountPath, entry.content);
    state.mountedFileKeys.add(fileKey(entry.file));
    mountedCount += 1;
    mountedBytes += entry.file.size;
  }
  const mountEnd = performance.now();

  state.totalMountedBytes += mountedBytes;
  if (startupTreeVersion) {
    state.loadedTreeVersions.add(startupTreeVersion);
  }
  state.loadedTreeVersions.add(resolvedRequirements.treeVersion);
  state.timelessMounted ||= resolvedRequirements.includeTimeless;
  state.mounted = true;
  state.mountStats = {
    ...(state.mountStats ?? {}),
    fetchMs: +(fetchEnd - fetchStart).toFixed(2),
    mountMs: +(mountEnd - mountStart).toFixed(2),
    requestedTreeVersion: resolvedRequirements.treeVersion,
    includeTimeless: resolvedRequirements.includeTimeless,
    requestedFileCount: state.manifest.mountFileCount,
    requestedBytes: state.manifest.mountBytes,
    newlyMountedCount: mountedCount,
    newlyMountedBytes: mountedBytes,
    totalMountedCount: state.mountedFileKeys.size,
    totalMountedBytes: state.totalMountedBytes,
  };

  appendLog(
    `Mounted ${mountedCount} new files (${formatBytes(mountedBytes)}) for ${describeRequirements(resolvedRequirements)} in ${(mountEnd - fetchStart).toFixed(2)} ms total.`,
  );
  setMetrics({
    mount: state.mountStats,
  });
  setStatus({
    mounted: true,
    booted: state.booted,
    notes: state.manifest.notes,
    loadedTreeVersions: Array.from(state.loadedTreeVersions).sort(),
    timelessMounted: state.timelessMounted,
  });

  return state.mountStats;
}

async function bootRuntime({ requirements } = {}) {
  if (state.booted) {
    appendLog("Headless PoB already booted.");
    return state.bootStats;
  }

  if (!state.mounted) {
    await mountRuntime({ requirements });
  }

  const engineStart = performance.now();
  const engine = await state.factory.createEngine({
    injectObjects: true,
    traceAllocations: true,
  });
  const engineEnd = performance.now();

  state.luaModule.module.FS.chdir("/pob/src");
  engine.global.set("__spike_js_log", (message) => appendLog(`[lua] ${message}`));

  const shimStart = performance.now();
  engine.doStringSync(LUA_LOG_SCRIPT);
  engine.doStringSync(LUA_COMPAT_SCRIPT);
  const shimEnd = performance.now();

  appendLog("Booting PoB headless wrapper...");
  const headlessStart = performance.now();
  engine.doFileSync("HeadlessWrapper.lua");
  engine.doStringSync(LUA_COMPAT_SCRIPT);
  engine.doStringSync(LUA_HELPER_SCRIPT);
  const headlessEnd = performance.now();

  const launchPromptRaw = engine.doStringSync("return __spike_get_launch_prompt_json()");
  const launchPrompt = launchPromptRaw === "null" ? null : JSON.parse(launchPromptRaw);
  if (launchPrompt) {
    throw new Error(launchPrompt);
  }

  const bootSummary = JSON.parse(engine.doStringSync("return __spike_get_boot_summary_json()"));

  state.engine = engine;
  state.booted = true;
  state.bootStats = {
    engineCreateMs: +(engineEnd - engineStart).toFixed(2),
    compatShimMs: +(shimEnd - shimStart).toFixed(2),
    headlessBootMs: +(headlessEnd - headlessStart).toFixed(2),
    memoryUsedBytes: engine.global.getMemoryUsed(),
    bootSummary,
  };

  appendLog("Headless PoB boot completed.");
  setMetrics({
    mount: state.mountStats,
    boot: state.bootStats,
  });
  setStatus({
    mounted: true,
    booted: true,
    bootSummary,
    loadedTreeVersions: Array.from(state.loadedTreeVersions).sort(),
    timelessMounted: state.timelessMounted,
  });

  return state.bootStats;
}

function decodeBuildCode(code) {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Build code is empty");
  }

  if (trimmed.startsWith("<PathOfBuilding") || trimmed.startsWith("<?xml")) {
    return trimmed;
  }

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  let inflated;
  try {
    inflated = inflate(bytes);
  } catch {
    inflated = inflateRaw(bytes);
  }

  const xml = new TextDecoder("utf-8").decode(inflated).trim();
  if (!(xml.startsWith("<PathOfBuilding") || xml.startsWith("<?xml"))) {
    throw new Error("Decoded payload was not valid PoB XML");
  }
  return xml;
}

async function fetchSampleBuild(sampleId) {
  const url = new URL("/api/browser-pob/file", self.location.origin);
  url.searchParams.set("kind", "data");
  url.searchParams.set("path", sampleId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sample build: ${response.status}`);
  }
  return response.text();
}

async function resolveRequirementsFromPayload(payload = {}) {
  if (payload.input?.trim()) {
    return inferBuildRequirements(decodeBuildCode(payload.input));
  }

  if (payload.sampleId) {
    const source = await fetchSampleBuild(payload.sampleId);
    return inferBuildRequirements(decodeBuildCode(source));
  }

  return {
    treeVersion: DEFAULT_TREE_VERSION,
    includeTimeless: false,
  };
}

function readConfigBundle() {
  const bundle = JSON.parse(state.engine.doStringSync("return __spike_get_config_bundle_json()"));
  state.configBundle = bundle;
  return bundle;
}

function readSkillsBundle() {
  const bundle = JSON.parse(state.engine.doStringSync("return __spike_get_skills_bundle_json()"));
  state.skillsBundle = bundle;
  return bundle;
}

function buildLastRunStatus(lastRun) {
  if (!lastRun) {
    return null;
  }

  return {
    mode: lastRun.mode,
    label: lastRun.label,
    outputKeyCount: lastRun.outputKeyCount,
    requirements: lastRun.requirements,
    profileMeta: lastRun.profileMeta,
    summary: lastRun.summary,
  };
}

function encodeConfigEntriesForLua(entries) {
  return entries
    .map((entry) => {
      const encodedKey = encodeURIComponent(entry.key ?? "");
      if (entry.kind === "boolean") {
        return `${encodedKey}\tboolean\t${entry.value ? "true" : "false"}`;
      }
      if (entry.kind === "number") {
        return `${encodedKey}\tnumber\t${String(entry.value ?? "")}`;
      }
      if (entry.kind === "string") {
        return `${encodedKey}\tstring\t${encodeURIComponent(String(entry.value ?? ""))}`;
      }
      return `${encodedKey}\tunset\t`;
    })
    .join("\n");
}

function stripConfigBundleFromRun(lastRun) {
  if (!lastRun) {
    return lastRun;
  }

  const { configBundle: _configBundle, skillsBundle: _skillsBundle, ...rest } = lastRun;
  return rest;
}

function emitWorkerState() {
  const lastRun = state.lastConfigRecalc ?? state.lastBuildLoad ?? null;

  setMetrics({
    mount: state.mountStats,
    boot: state.bootStats,
    buildLoad: stripConfigBundleFromRun(state.lastBuildLoad),
    configRecalc: stripConfigBundleFromRun(state.lastConfigRecalc),
    lastRun: stripConfigBundleFromRun(lastRun),
  });
  setStatus({
    mounted: state.mounted,
    booted: state.booted,
    loadedTreeVersions: Array.from(state.loadedTreeVersions).sort(),
    timelessMounted: state.timelessMounted,
    lastRun: buildLastRunStatus(lastRun),
    hasConfigBundle: Boolean(state.configBundle),
    hasSkillsBundle: Boolean(state.skillsBundle),
  });
}

async function runXmlBuild(xml, label, mode, requirements) {
  let resolvedRequirements = requirements;
  await mountRuntime({ requirements: resolvedRequirements });

  if (!state.booted) {
    await bootRuntime({ requirements: resolvedRequirements });
  }

  const loadStart = performance.now();
  try {
    state.engine.global.set("__spike_build_xml", xml);
    state.engine.global.set("__spike_build_name", label);
    state.engine.doStringSync("loadBuildFromXML(__spike_build_xml, __spike_build_name)");
  } catch (error) {
    if (!shouldRetryWithTimelessData(error, resolvedRequirements)) {
      throw error;
    }
    resolvedRequirements = await mountTimelessDataAndRetry(resolvedRequirements);
    state.engine.global.set("__spike_build_xml", xml);
    state.engine.global.set("__spike_build_name", label);
    state.engine.doStringSync("loadBuildFromXML(__spike_build_xml, __spike_build_name)");
  }
  const loadEnd = performance.now();

  const summary = JSON.parse(state.engine.doStringSync("return __spike_get_output_summary_json()"));
  const configBundle = readConfigBundle();
  const skillsBundle = readSkillsBundle();
  const outputKeyCount = state.engine.doStringSync("return __spike_get_output_key_count()");
  const launchPromptRaw = state.engine.doStringSync("return __spike_get_launch_prompt_json()");
  const launchPrompt = launchPromptRaw === "null" ? null : JSON.parse(launchPromptRaw);
  if (launchPrompt) {
    throw new Error(launchPrompt);
  }
  const memoryUsedBytes = state.engine.global.getMemoryUsed();

  state.lastBuildLoad = {
    mode,
    label,
    loadBuildMs: +(loadEnd - loadStart).toFixed(2),
    outputKeyCount,
    memoryUsedBytes,
    summary,
    requirements: resolvedRequirements,
    configBundle,
    skillsBundle,
  };
  state.lastConfigRecalc = null;
  state.currentBuild = {
    type: "xml",
    label,
    requirements: resolvedRequirements,
  };

  appendLog(`Finished ${mode} run for "${label}" in ${state.lastBuildLoad.loadBuildMs} ms.`);
  emitWorkerState();

  return state.lastBuildLoad;
}

async function runJsonBuild(itemsJson, passiveSkillsJson, label, mode, requirements, profileMeta) {
  let resolvedRequirements = requirements;
  await mountRuntime({ requirements: resolvedRequirements });

  if (!state.booted) {
    await bootRuntime({ requirements: resolvedRequirements });
  }

  const loadStart = performance.now();
  try {
    state.engine.global.set("__spike_items_json", itemsJson);
    state.engine.global.set("__spike_passive_skills_json", passiveSkillsJson);
    state.engine.global.set("__spike_build_name", label);
    state.engine.doStringSync(`
      loadBuildFromJSON(__spike_items_json, __spike_passive_skills_json)
      if build then
        build.buildName = __spike_build_name
      end
      runCallback("OnFrame")
    `);
  } catch (error) {
    if (!shouldRetryWithTimelessData(error, resolvedRequirements)) {
      throw error;
    }
    resolvedRequirements = await mountTimelessDataAndRetry(resolvedRequirements);
    state.engine.global.set("__spike_items_json", itemsJson);
    state.engine.global.set("__spike_passive_skills_json", passiveSkillsJson);
    state.engine.global.set("__spike_build_name", label);
    state.engine.doStringSync(`
      loadBuildFromJSON(__spike_items_json, __spike_passive_skills_json)
      if build then
        build.buildName = __spike_build_name
      end
      runCallback("OnFrame")
    `);
  }
  const loadEnd = performance.now();

  const summary = JSON.parse(state.engine.doStringSync("return __spike_get_output_summary_json()"));
  const configBundle = readConfigBundle();
  const skillsBundle = readSkillsBundle();
  const outputKeyCount = state.engine.doStringSync("return __spike_get_output_key_count()");
  const launchPromptRaw = state.engine.doStringSync("return __spike_get_launch_prompt_json()");
  const launchPrompt = launchPromptRaw === "null" ? null : JSON.parse(launchPromptRaw);
  if (launchPrompt) {
    throw new Error(launchPrompt);
  }
  const memoryUsedBytes = state.engine.global.getMemoryUsed();

  state.lastBuildLoad = {
    mode,
    label,
    loadBuildMs: +(loadEnd - loadStart).toFixed(2),
    outputKeyCount,
    memoryUsedBytes,
    summary,
    requirements: resolvedRequirements,
    profileMeta,
    configBundle,
    skillsBundle,
  };
  state.lastConfigRecalc = null;
  state.currentBuild = {
    type: "profile",
    label,
    requirements: resolvedRequirements,
    profileMeta,
  };

  appendLog(`Finished ${mode} run for "${label}" in ${state.lastBuildLoad.loadBuildMs} ms.`);
  emitWorkerState();

  return state.lastBuildLoad;
}

async function applyConfigEntries({ entries } = {}) {
  return applyBuildAdjustments({ entries });
}

function encodeSkillStateForLua(skillState) {
  if (!skillState || typeof skillState !== "object") {
    return "";
  }

  const lines = [];
  if (typeof skillState.primarySocketGroupIndex === "number" && Number.isFinite(skillState.primarySocketGroupIndex)) {
    lines.push(`primary\t${String(skillState.primarySocketGroupIndex)}`);
  }

  const groupEntries = Object.entries(skillState.socketGroups ?? {})
    .map(([groupIndex, groupState]) => [Number(groupIndex), groupState])
    .filter(([groupIndex]) => Number.isFinite(groupIndex))
    .sort((left, right) => left[0] - right[0]);

  for (const [groupIndex, groupState] of groupEntries) {
    lines.push(`group\t${groupIndex}\tenabled\t${groupState?.enabled ? "true" : "false"}`);
    lines.push(`group\t${groupIndex}\tincludeInFullDPS\t${groupState?.includeInFullDPS ? "true" : "false"}`);
    if (typeof groupState?.activeSkillIndex === "number" && Number.isFinite(groupState.activeSkillIndex)) {
      lines.push(`group\t${groupIndex}\tactiveSkillIndex\t${String(groupState.activeSkillIndex)}`);
    }

    const gemEntries = Object.entries(groupState?.gems ?? {})
      .map(([gemIndex, gemState]) => [Number(gemIndex), gemState])
      .filter(([gemIndex]) => Number.isFinite(gemIndex))
      .sort((left, right) => left[0] - right[0]);

    for (const [gemIndex, gemState] of gemEntries) {
      lines.push(`gem\t${groupIndex}\t${gemIndex}\tenabled\t${gemState?.enabled ? "true" : "false"}`);
    }
  }

  return lines.join("\n");
}

async function applyBuildAdjustments({ entries, skillState } = {}) {
  if (!state.booted || !state.engine || !state.currentBuild) {
    throw new Error("Load a build first.");
  }

  const applyStart = performance.now();
  state.engine.global.set("__spike_config_entries_json", encodeConfigEntriesForLua(Array.isArray(entries) ? entries : []));
  state.engine.global.set("__spike_skill_state_json", encodeSkillStateForLua(skillState));
  state.engine.doStringSync("return __spike_apply_build_adjustments_json(__spike_config_entries_json, __spike_skill_state_json)");
  const configBundle = readConfigBundle();
  const skillsBundle = readSkillsBundle();
  const applyEnd = performance.now();

  const summary = JSON.parse(state.engine.doStringSync("return __spike_get_output_summary_json()"));
  const outputKeyCount = state.engine.doStringSync("return __spike_get_output_key_count()");
  const memoryUsedBytes = state.engine.global.getMemoryUsed();

  state.configBundle = configBundle;
  state.skillsBundle = skillsBundle;
  state.lastConfigRecalc = {
    mode: "manual-recalc",
    label: state.currentBuild.profileMeta?.characterName ?? state.currentBuild.label ?? "Current Build",
    recalcMs: +(applyEnd - applyStart).toFixed(2),
    outputKeyCount,
    memoryUsedBytes,
    summary,
    requirements: state.currentBuild.requirements,
    profileMeta: state.currentBuild.profileMeta,
    configBundle,
    skillsBundle,
  };

  appendLog(`Recalculated current build in ${state.lastConfigRecalc.recalcMs} ms after manual config or skill changes.`);
  emitWorkerState();

  return state.lastConfigRecalc;
}

async function exportBuildCode() {
  if (!state.booted || !state.engine) {
    throw new Error("Load a build first.");
  }

  const xml = state.engine.doStringSync("return __spike_export_current_build_xml()");
  if (!xml) {
    throw new Error("Current build could not be exported.");
  }

  const code = encodeBuildCode(xml);
  appendLog(`Exported current build to PoB code (${code.length} chars).`);
  return {
    code,
    xmlLength: xml.length,
    codeLength: code.length,
    currentBuild: state.currentBuild,
  };
}

async function exportConfigPreset() {
  if (!state.booted || !state.engine) {
    throw new Error("Load a build first.");
  }

  const preset = JSON.parse(state.engine.doStringSync("return __spike_get_active_config_preset_json()"));
  appendLog(`Exported current config preset (${Object.keys(preset.inputs ?? {}).length} explicit values).`);
  return preset;
}

async function runSampleBuild({ sampleId, warm } = { warm: false }) {
  if (!sampleId) {
    throw new Error("No sample build selected");
  }

  let xml = state.lastXml;
  let decodeMs = 0;
  let sourceBytes = 0;

  if (!warm || !xml || state.lastSampleId !== sampleId) {
    const source = await fetchSampleBuild(sampleId);
    sourceBytes = source.length;
    const decodeStart = performance.now();
    xml = decodeBuildCode(source);
    const decodeEnd = performance.now();
    decodeMs = +(decodeEnd - decodeStart).toFixed(2);
    state.lastXml = xml;
    state.lastSampleId = sampleId;
  }

  const requirements = inferBuildRequirements(xml);
  appendLog(`Preflighted "${sampleId}" as ${describeRequirements(requirements)}.`);

  const sampleSource = state.catalog?.sampleBuilds ?? state.manifest?.sampleBuilds ?? [];
  const sample = sampleSource.find((entry) => entry.id === sampleId);
  const result = await runXmlBuild(xml, sample?.label ?? sampleId, warm ? "warm-sample" : "cold-sample", requirements);
  result.decodeMs = decodeMs;
  result.sourceBytes = sourceBytes;
  emitWorkerState();
  return result;
}

async function runCustomBuild({ input } = {}) {
  if (!input?.trim()) {
    throw new Error("Paste a PoB code or XML first");
  }

  const decodeStart = performance.now();
  const xml = decodeBuildCode(input);
  const decodeEnd = performance.now();
  const requirements = inferBuildRequirements(xml);
  state.lastXml = xml;
  state.lastSampleId = "";
  appendLog(`Preflighted custom build as ${describeRequirements(requirements)}.`);

  const result = await runXmlBuild(xml, "Custom Build", "custom", requirements);
  result.decodeMs = +(decodeEnd - decodeStart).toFixed(2);
  result.sourceBytes = input.length;
  emitWorkerState();
  return result;
}

async function loadProfileCharacters({ realm, accountName, sessionId } = {}) {
  appendLog(`Fetching Path of Exile characters for ${accountName || "<missing account>"}...`);
  const result = await fetchProfileCharacters({ realm, accountName, sessionId });
  appendLog(`Retrieved ${result.characters.length} characters for ${result.accountName}.`);
  setStatus({
    mounted: state.mounted,
    booted: state.booted,
    profileAccount: result.accountName,
    profileRealm: result.realm,
    profileCharacterCount: result.characters.length,
  });
  return result;
}

async function runProfileCharacterBuild({ realm, accountName, characterName, sessionId } = {}) {
  if (!accountName?.trim()) {
    throw new Error("Account name is required.");
  }
  if (!characterName?.trim()) {
    throw new Error("Select a character first.");
  }

  appendLog(`Importing Path of Exile character "${characterName}" from ${accountName}...`);
  const fetchStart = performance.now();
  const profileImport = await fetchProfileCharacterImport({
    realm,
    accountName,
    characterName,
    sessionId,
  });
  const fetchEnd = performance.now();
  appendLog(`Fetched items and passive tree for "${characterName}" in ${(fetchEnd - fetchStart).toFixed(2)} ms.`);

  let requirements = {
    treeVersion: DEFAULT_TREE_VERSION,
    includeTimeless: usesTimelessJewelData(profileImport.itemsJson, profileImport.passiveSkillsJson),
  };

  const result = await runJsonBuild(
    profileImport.itemsJson,
    profileImport.passiveSkillsJson,
    profileImport.characterName,
    "profile-import",
    requirements,
    {
      realm: profileImport.realm,
      accountName: profileImport.accountName,
      characterName: profileImport.characterName,
      profileFetchMs: +(fetchEnd - fetchStart).toFixed(2),
    },
  );

  return {
    accountName: profileImport.accountName,
    characterName: profileImport.characterName,
    realm: profileImport.realm,
    result,
  };
}

async function handleRequest(command, payload) {
  switch (command) {
    case "fetchManifest":
      return fetchManifest();
    case "mountRuntime":
      return mountRuntime({
        requirements: await resolveRequirementsFromPayload(payload),
      });
    case "bootRuntime":
      return bootRuntime({
        requirements: await resolveRequirementsFromPayload(payload),
      });
    case "loadProfileCharacters":
      return loadProfileCharacters(payload);
    case "runSampleBuild":
      return runSampleBuild(payload);
    case "runCustomBuild":
      return runCustomBuild(payload);
    case "runProfileCharacterBuild":
      return runProfileCharacterBuild(payload);
    case "applyConfigEntries":
      return applyConfigEntries(payload);
    case "applyBuildAdjustments":
      return applyBuildAdjustments(payload);
    case "exportBuildCode":
      return exportBuildCode();
    case "exportConfigPreset":
      return exportConfigPreset();
    default:
      throw new Error(`Unknown worker command: ${command}`);
  }
}

self.addEventListener("message", (event) => {
  const data = event.data ?? {};
  if (data.type !== "request") {
    return;
  }

  void (async () => {
    try {
      setPending(true);
      const result = await handleRequest(data.command, data.payload ?? {});
      emitResponse(data.id, true, { result: result ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog(message);
      setStatus({
        mounted: state.mounted,
        booted: state.booted,
        error: message,
      });
      emitResponse(data.id, false, { error: message });
    } finally {
      setPending(false);
    }
  })();
});

setStatus({
  mounted: false,
  booted: false,
  note: "Worker idle. Load a Path of Exile character first, then update calculations manually after config changes.",
});
setMetrics({
  note: "No metrics yet.",
});
appendLog("Worker runtime loaded.");
emit("ready");
