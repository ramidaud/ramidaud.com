-- Shared helpers for the Web Gallery menu commands.
local LrPathUtils = import "LrPathUtils"
local LrFileUtils = import "LrFileUtils"
local LrDialogs = import "LrDialogs"
local LrPrefs = import "LrPrefs"

local C = {}
C.PLUGIN_ID = "com.ramidaud.webgallery"

function C.trim(s)
  if type(s) ~= "string" then return "" end
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

function C.field(photo, key)
  local ok, v = pcall(photo.getFormattedMetadata, photo, key)
  if ok and type(v) == "string" then return C.trim(v) end
  return ""
end

function C.raw(photo, key)
  local ok, v = pcall(photo.getRawMetadata, photo, key)
  if ok then return v end
  return nil
end

function C.prop(photo, key)
  local ok, v = pcall(photo.getPropertyForPlugin, photo, _PLUGIN, key)
  if ok and type(v) == "string" then return C.trim(v) end
  return ""
end

function C.fileLabel(photo)
  local path = C.raw(photo, "path")
  if type(path) == "string" and path ~= "" then return LrPathUtils.leafName(path) end
  return "photo " .. tostring(photo.localIdentifier)
end

function C.writeFile(path, text)
  local fh = assert(io.open(path, "wb"))
  fh:write(text)
  fh:close()
end

function C.readFile(path)
  local fh = io.open(path, "rb")
  if not fh then return nil end
  local s = fh:read("*a")
  fh:close()
  return s
end

-- The folder that holds galleries and _drafts. Remembered after the first time.
function C.draftsRoot(askIfMissing)
  local prefs = LrPrefs.prefsForPlugin()
  local root = prefs.wgRoot
  if (not root or root == "" or not LrFileUtils.exists(root)) and askIfMissing then
    local picked = LrDialogs.runOpenPanel {
      title = "Choose your gallery folder (the same one the Web Gallery publish service uses)",
      canChooseFiles = false, canChooseDirectories = true, canCreateDirectories = true, allowsMultipleSelection = false,
    }
    if not picked or not picked[1] then return nil end
    root = picked[1]
    prefs.wgRoot = root
  end
  return root
end

return C
