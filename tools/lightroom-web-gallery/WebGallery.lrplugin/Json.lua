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

-- ---------- decoding ----------
local function utf8char(cp)
  if cp < 0x80 then return string.char(cp) end
  if cp < 0x800 then return string.char(0xC0 + math.floor(cp / 0x40), 0x80 + cp % 0x40) end
  if cp < 0x10000 then return string.char(0xE0 + math.floor(cp / 0x1000), 0x80 + math.floor(cp / 0x40) % 0x40, 0x80 + cp % 0x40) end
  return string.char(0xF0 + math.floor(cp / 0x40000), 0x80 + math.floor(cp / 0x1000) % 0x40, 0x80 + math.floor(cp / 0x40) % 0x40, 0x80 + cp % 0x40)
end

function Json.decode(text)
  local pos = 1
  local function err(msg) error("JSON: " .. msg .. " at character " .. pos, 0) end
  local function ws() pos = string.find(text, "[^ \t\r\n]", pos) or (#text + 1) end
  local value
  local function str()
    pos = pos + 1
    local out = {}
    while true do
      local c = string.sub(text, pos, pos)
      if c == "" then err("unterminated string") end
      if c == '"' then pos = pos + 1; return table.concat(out) end
      if c == "\\" then
        local e = string.sub(text, pos + 1, pos + 1)
        local map = { ['"'] = '"', ["\\"] = "\\", ["/"] = "/", b = "\b", f = "\f", n = "\n", r = "\r", t = "\t" }
        if map[e] then out[#out + 1] = map[e]; pos = pos + 2
        elseif e == "u" then
          local cp = tonumber(string.sub(text, pos + 2, pos + 5), 16) or err("bad \\u escape")
          pos = pos + 6
          if cp >= 0xD800 and cp <= 0xDBFF and string.sub(text, pos, pos + 1) == "\\u" then
            local lo = tonumber(string.sub(text, pos + 2, pos + 5), 16)
            if lo and lo >= 0xDC00 and lo <= 0xDFFF then cp = 0x10000 + (cp - 0xD800) * 0x400 + (lo - 0xDC00); pos = pos + 6 end
          end
          out[#out + 1] = utf8char(cp)
        else err("bad escape") end
      else
        local stop = string.find(text, '["\\]', pos) or (#text + 1)
        out[#out + 1] = string.sub(text, pos, stop - 1)
        pos = stop
      end
    end
  end
  function value()
    ws()
    local c = string.sub(text, pos, pos)
    if c == "{" then
      pos = pos + 1; local obj = {}; ws()
      if string.sub(text, pos, pos) == "}" then pos = pos + 1; return obj end
      while true do
        ws(); if string.sub(text, pos, pos) ~= '"' then err("expected a key") end
        local k = str(); ws()
        if string.sub(text, pos, pos) ~= ":" then err("expected ':'") end
        pos = pos + 1; obj[k] = value(); ws()
        local d = string.sub(text, pos, pos); pos = pos + 1
        if d == "}" then return obj end
        if d ~= "," then err("expected ',' or '}'") end
      end
    elseif c == "[" then
      pos = pos + 1; local arr = {}; ws()
      if string.sub(text, pos, pos) == "]" then pos = pos + 1; return arr end
      while true do
        arr[#arr + 1] = value(); ws()
        local d = string.sub(text, pos, pos); pos = pos + 1
        if d == "]" then return arr end
        if d ~= "," then err("expected ',' or ']'") end
      end
    elseif c == '"' then return str()
    elseif string.sub(text, pos, pos + 3) == "true" then pos = pos + 4; return true
    elseif string.sub(text, pos, pos + 4) == "false" then pos = pos + 5; return false
    elseif string.sub(text, pos, pos + 3) == "null" then pos = pos + 4; return nil
    else
      local num = string.match(text, "^-?%d+%.?%d*[eE]?[-+]?%d*", pos)
      if not num or num == "" then err("unexpected '" .. c .. "'") end
      pos = pos + #num
      return tonumber(num)
    end
  end
  local ok, result = pcall(function() local v = value(); ws(); return v end)
  if not ok then return nil, result end
  return result
end

return Json
