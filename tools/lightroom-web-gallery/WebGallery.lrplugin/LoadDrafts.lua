--[[ Library > Plug-in Extras > Web Gallery: Load caption drafts...
  Reads drafts.json from a batch folder and puts each draft into the Web Gallery fields.
  Your real title, caption and keywords are not touched. Status becomes "Draft waiting for review".

  drafts.json: { "drafts": [ { "uuid": "...", "id": "123", "title": "", "caption": "",
                                "alt": "", "keywords": ["a", "b"], "notes": "" } ] }
]]
local LrApplication = import "LrApplication"
local LrDialogs = import "LrDialogs"
local LrTasks = import "LrTasks"
local LrPathUtils = import "LrPathUtils"
local LrFileUtils = import "LrFileUtils"

local Json = require "Json"
local C = require "Common"

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local root = C.draftsRoot(true)
  local start = root and LrPathUtils.child(root, "_drafts") or nil
  local picked = LrDialogs.runOpenPanel {
    title = "Choose drafts.json in a batch folder",
    canChooseFiles = true, canChooseDirectories = false, allowsMultipleSelection = false,
    fileTypes = { "json" }, initialDirectory = start,
  }
  if not picked or not picked[1] then return end
  local text = C.readFile(picked[1])
  local data, err = Json.decode(text or "")
  if not data or type(data.drafts) ~= "table" then
    LrDialogs.message("Couldn't read that file", tostring(err or "No \"drafts\" list in it."), "critical")
    return
  end

  -- Match by uuid; fall back to the local id for drafts that only carry "id".
  local byId = {}
  local manifestText = C.readFile(LrPathUtils.child(LrPathUtils.parent(picked[1]), "manifest.json"))
  local manifest = manifestText and Json.decode(manifestText)
  if manifest and manifest.photos then
    for _, p in ipairs(manifest.photos) do byId[tostring(p.id)] = p.uuid end
  end

  local loaded, missing = 0, {}
  catalog:withWriteAccessDo("Web Gallery: load caption drafts", function()
    for _, d in ipairs(data.drafts) do
      local uuid = d.uuid
      if (not uuid or uuid == "") and d.id then uuid = byId[tostring(d.id)] end
      local photo = uuid and catalog:findPhotoByUuid(uuid)
      if photo then
        local kws = d.keywords
        if type(kws) == "table" then kws = table.concat(kws, ", ") end
        photo:setPropertyForPlugin(_PLUGIN, "wgDraftTitle", C.trim(d.title or ""))
        photo:setPropertyForPlugin(_PLUGIN, "wgDraftCaption", C.trim(d.caption or ""))
        photo:setPropertyForPlugin(_PLUGIN, "wgDraftAlt", C.trim(d.alt or ""))
        photo:setPropertyForPlugin(_PLUGIN, "wgDraftKeywords", C.trim(kws or ""))
        photo:setPropertyForPlugin(_PLUGIN, "wgDraftNotes", C.trim(d.notes or ""))
        photo:setPropertyForPlugin(_PLUGIN, "wgStatus", "drafted")
        loaded = loaded + 1
      else
        missing[#missing + 1] = tostring(d.id or d.uuid or "?")
      end
    end
  end, { timeout = 60 })

  local more = #missing > 0 and ("\n\nNot found in this catalog: " .. table.concat(missing, ", ", 1, math.min(#missing, 10))) or ""
  LrDialogs.message(loaded .. " drafts loaded",
    "Open the Metadata panel and choose the \"Web Gallery\" preset to see them. Edit anything, then use Web Gallery: Approve drafts for selected photos." .. more,
    "info")
end)
