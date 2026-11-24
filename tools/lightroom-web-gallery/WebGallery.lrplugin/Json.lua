-- Small JSON writer (Lightroom has no JSON library). Strings, numbers, booleans, arrays, objects.
local Json = {}

local escapes = { ['"'] = '\\"', ['\\'] = '\\\\', ['\b'] = '\\b', ['\f'] = '\\f', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }

local function str(s)
  s = tostring(s or "")
  s = s:gsub('[%c"\\]', function(c) return escapes[c] or string.format("\\u%04x", c:byte()) end)
  return '"' .. s .. '"'
end

local function isArray(t)
  local n = 0
  for k in pairs(t) do
    if type(k) ~= "number" then return false end
    n = n + 1
  end
  return n == #t
end

function Json.encode(v, indent)
  indent = indent or ""
  local t = type(v)
  if t == "nil" then return "null" end
  if t == "boolean" then return v and "true" or "false" end
  if t == "number" then
    if v ~= v or v == math.huge or v == -math.huge then return "null" end
    if math.floor(v) == v then return string.format("%d", v) end
    return string.format("%.4g", v)
  end
  if t == "string" then return str(v) end
  if t == "table" then
    local inner = indent .. "  "
    local parts = {}
    if isArray(v) then
      if #v == 0 then return "[]" end
      for i = 1, #v do parts[#parts + 1] = inner .. Json.encode(v[i], inner) end
      return "[\n" .. table.concat(parts, ",\n") .. "\n" .. indent .. "]"
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = tostring(k) end
    table.sort(keys)
    for _, k in ipairs(keys) do parts[#parts + 1] = inner .. str(k) .. ": " .. Json.encode(v[k], inner) end
    if #parts == 0 then return "{}" end
    return "{\n" .. table.concat(parts, ",\n") .. "\n" .. indent .. "}"
  end
  return "null"
end

return Json
