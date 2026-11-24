--[[ Library > Plug-in Extras > Web Gallery: Send selected for caption drafts...
  Exports a small proof (1200 px, location removed) of each selected photo into
  <gallery folder>/_drafts/<date-time>/ with manifest.json: what Lightroom already knows about each
  photo (file, folder, date, title, caption, keywords, camera). Nothing in the catalog changes except
  each photo's Gallery status, which becomes "Sent for drafts".
]]
local LrApplication = import "LrApplication"
local LrDialogs = import "LrDialogs"
local LrTasks = import "LrTasks"
local LrPathUtils = import "LrPathUtils"
local LrFileUtils = import "LrFileUtils"
local LrDate = import "LrDate"
local LrExportSession = import "LrExportSession"
local LrProgressScope = import "LrProgressScope"

local Json = require "Json"
local C = require "Common"

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local photos = catalog:getTargetPhotos()
  if #photos == 0 then
    LrDialogs.message("Select some photos first", "Pick the photos you want caption drafts for, then run this again.", "info")
    return
  end
  if #photos > 60 then
    local go = LrDialogs.confirm(
      "Send " .. #photos .. " photos for drafts?",
      "Drafting goes best in batches of 15 to 60, so you can review them in one sitting.",
      "Send all " .. #photos, "Cancel")
    if go ~= "ok" then return end
  end

  local root = C.draftsRoot(true)
  if not root then return end
  local batch = LrDate.timeToUserFormat(LrDate.currentTime(), "%Y-%m-%d-%H%M")
  local dir = LrPathUtils.child(LrPathUtils.child(root, "_drafts"), batch)
  LrFileUtils.createAllDirectories(dir)

  local progress = LrProgressScope { title = "Sending " .. #photos .. " photos for caption drafts" }
  local session = LrExportSession {
    photosToExport = photos,
    exportSettings = {
      LR_export_destinationType = "specificFolder",
      LR_export_destinationPathPrefix = dir,
      LR_export_useSubfolder = false,
      LR_collisionHandling = "overwrite",
      LR_format = "JPEG",
      LR_jpeg_quality = 0.7,
      LR_export_colorSpace = "sRGB",
      LR_size_doConstrain = true,
      LR_size_resizeType = "longEdge",
      LR_size_maxWidth = 1200,
      LR_size_maxHeight = 1200,
      LR_size_units = "pixels",
      LR_size_resolution = 72,
      LR_removeLocationMetadata = true,
      LR_metadata_keywordOptions = "flat",
      LR_outputSharpeningOn = false,
      LR_includeVideoFiles = false,
    },
  }

  local items, done = {}, 0
  local total = session:countRenditions()
  for _, rendition in session:renditions() do
    if progress:isCanceled() then break end
    local photo = rendition.photo
    local ok, path = rendition:waitForRender()
    if ok then
      local id = tostring(photo.localIdentifier)
      local proof = LrPathUtils.child(dir, id .. ".jpg")
      if path ~= proof then
        if LrFileUtils.exists(proof) then LrFileUtils.delete(proof) end
        LrFileUtils.move(path, proof)
      end
      local t = C.raw(photo, "dateTimeOriginal") or C.raw(photo, "dateTime")
      local path0 = C.raw(photo, "path") or ""
      items[#items + 1] = {
        id = id,
        uuid = C.raw(photo, "uuid") or "",
        proof = id .. ".jpg",
        fileName = LrPathUtils.leafName(path0),
        folder = LrPathUtils.parent(path0) or "",
        captureDate = type(t) == "number" and LrDate.timeToUserFormat(t, "%Y-%m-%d %H:%M") or "",
        title = C.field(photo, "title"),
        headline = C.field(photo, "headline"),
        caption = C.field(photo, "caption"),
        keywords = C.field(photo, "keywordTags"),
        city = C.field(photo, "city"),
        state = C.field(photo, "stateProvince"),
        country = C.field(photo, "country"),
        creator = C.field(photo, "creator"),
        camera = C.field(photo, "cameraModel"),
        lens = C.field(photo, "lens"),
        rating = C.raw(photo, "rating") or 0,
      }
    end
    done = done + 1
    progress:setPortionComplete(done, total)
  end

  local manifest = {
    batch = batch,
    created = LrDate.timeToW3CDate(LrDate.currentTime()),
    count = #items,
    instructions = "Write drafts.json in this folder. See the web-gallery skill. Drafts stay drafts until the photographer approves them in Lightroom.",
    photos = items,
  }
  C.writeFile(LrPathUtils.child(dir, "manifest.json"), Json.encode(manifest))

  catalog:withWriteAccessDo("Web Gallery: mark sent for drafts", function()
    for _, photo in ipairs(photos) do
      if C.prop(photo, "wgStatus") ~= "approved" then photo:setPropertyForPlugin(_PLUGIN, "wgStatus", "sent") end
    end
  end, { timeout = 30 })

  progress:done()
  LrDialogs.message(
    #items .. " photos sent for drafts",
    "Folder: _drafts/" .. batch .. "\n\nAsk Claude: \"Draft captions for the Web Gallery batch " .. batch .. ".\" When drafts.json is there, use Web Gallery: Load caption drafts.",
    "info")
end)
