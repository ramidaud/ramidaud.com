--[[ Publish to Web Gallery: the publish service.

  What it does
  - Each published collection (plain or smart) becomes a subfolder of the gallery folder you pick.
  - Lightroom renders the JPEGs with the File Settings, Image Sizing and Metadata you choose.
  - Next to each JPEG goes a small .json sidecar with its title, caption, alt text, date and keywords.
  - gallery.json in each folder lists every photo, oldest first. A website reads that one file.
  - A photo with no caption is not published. Lightroom marks it, and it stays in "Modified Photos
    to Re-Publish" until a person writes one. That is the human gate.

  Nothing here talks to the internet, and nothing writes to your catalog except the publish record
  Lightroom keeps for every publish service.
]]

local LrPathUtils = import "LrPathUtils"
local LrFileUtils = import "LrFileUtils"
local LrDialogs = import "LrDialogs"
local LrView = import "LrView"
local LrDate = import "LrDate"
local LrApplication = import "LrApplication"

local Json = require "Json"

local provider = {}

-- ---------- export dialog ----------
provider.supportsIncrementalPublish = "only"
provider.canExportVideo = false
provider.allowFileFormats = { "JPEG" }
provider.allowColorSpaces = { "sRGB" }
provider.hidePrintResolution = true
provider.hideSections = { "exportLocation", "fileNaming", "video", "postProcessing" }
provider.small_icon = nil

provider.exportPresetFields = {
  { key = "wgRoot", default = "" },
  { key = "wgRequireCaption", default = true },
  { key = "wgRequireAlt", default = false },
}

function provider.sectionsForTopOfDialog(f, propertyTable)
  local bind = LrView.bind
  return {
    {
      title = "Web gallery",
      synopsis = bind { key = "wgRoot", object = propertyTable },
      f:row {
        f:static_text { title = "Gallery folder:", width = LrView.share "wgLabel" },
        f:edit_field { value = bind "wgRoot", width_in_chars = 36, immediate = true },
        f:push_button {
          title = "Choose...",
          action = function()
            local picked = LrDialogs.runOpenPanel {
              title = "Choose the folder your galleries go in",
              canChooseFiles = false, canChooseDirectories = true, canCreateDirectories = true,
              allowsMultipleSelection = false,
            }
            if picked and picked[1] then propertyTable.wgRoot = picked[1] end
          end,
        },
      },
      f:row {
        f:static_text { title = "", width = LrView.share "wgLabel" },
        f:checkbox { title = "Hold back photos without a caption", value = bind "wgRequireCaption" },
      },
      f:row {
        f:static_text { title = "", width = LrView.share "wgLabel" },
        f:checkbox { title = "Hold back photos without alt text (Lightroom Classic 13 or later)", value = bind "wgRequireAlt" },
      },
      f:row {
        f:static_text { title = "", width = LrView.share "wgLabel" },
        f:static_text {
          title = "Each collection becomes a folder with gallery.json. In Metadata below, keep Remove Person Info and Remove Location Info on for public galleries.",
          width_in_chars = 50, height_in_lines = 2,
        },
      },
    },
  }
end

function provider.updateExportSettings(exportSettings)
  -- A web gallery is always sRGB JPEG.
  exportSettings.LR_format = "JPEG"
  exportSettings.LR_export_colorSpace = "sRGB"
end

-- ---------- collections ----------
function provider.getCollectionBehaviorInfo(publishSettings)
  return {
    defaultCollectionName = "Gallery",
    defaultCollectionCanBeDeleted = true,
    canAddCollection = true,
    maxCollectionSetDepth = 0,
  }
end

-- Changing any of these marks a published photo for re-publish.
provider.metadataThatTriggersRepublish = function(publishSettings)
  return { default = false, title = true, caption = true, keywords = true, dateCreated = true, customMetadata = true }
end

-- ---------- helpers ----------
local function slugify(name)
  local s = string.lower(name or "gallery")
  s = s:gsub("[^%w]+", "-"):gsub("^-+", ""):gsub("-+$", "")
  if s == "" then s = "gallery" end
  return s
end

local function trim(s)
  if type(s) ~= "string" then return "" end
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

-- Read a formatted field without failing on keys this Lightroom version doesn't know.
local function field(photo, key)
  local ok, v = pcall(photo.getFormattedMetadata, photo, key)
  if ok and type(v) == "string" then return trim(v) end
  return ""
end

local function altText(photo)
  -- Lightroom Classic 13 added IPTC Alt Text. Try the known key names.
  for _, key in ipairs { "altTextAccessibility", "altText" } do
    local v = field(photo, key)
    if v ~= "" then return v end
  end
  return ""
end

local function keywordList(photo)
  local out = {}
  local s = field(photo, "keywordTags")
  for raw in string.gmatch(s, "[^,]+") do
    local kw = trim(raw)
    if kw ~= "" then out[#out + 1] = kw end
  end
  return out
end

local function captureTime(photo)
  local ok, t = pcall(photo.getRawMetadata, photo, "dateTimeOriginal")
  if ok and type(t) == "number" then return t end
  ok, t = pcall(photo.getRawMetadata, photo, "dateTime")
  if ok and type(t) == "number" then return t end
  return nil
end

local function writeFile(path, text)
  local fh = assert(io.open(path, "wb"))
  fh:write(text)
  fh:close()
end

local function readFile(path)
  local fh = io.open(path, "rb")
  if not fh then return nil end
  local s = fh:read("*a")
  fh:close()
  return s
end

-- Rebuild gallery.json from the sidecars in a folder. Sidecar names start with the capture
-- time, so sorting the names sorts the photos oldest first.
local function rebuildGallery(dir, collectionName)
  local names = {}
  for path in LrFileUtils.files(dir) do
    local leaf = LrPathUtils.leafName(path)
    if leaf ~= "gallery.json" and string.match(leaf, "%.json$") then names[#names + 1] = leaf end
  end
  table.sort(names)
  local items = {}
  for _, leaf in ipairs(names) do
    local text = readFile(LrPathUtils.child(dir, leaf))
    if text and text ~= "" then items[#items + 1] = text end
  end
  local head = {
    collection = collectionName,
    updated = LrDate.timeToW3CDate(LrDate.currentTime()),
    count = #items,
    generator = "Publish to Web Gallery 0.1 (Lightroom Classic)",
  }
  local headText = Json.encode(head)
  -- Splice the sidecar objects in as the "photos" array without re-parsing them.
  local photosText = ",\n  \"photos\": [\n" .. table.concat(items, ",\n") .. "\n  ]\n}"
  local body = headText:gsub("\n}$", function() return photosText end)
  writeFile(LrPathUtils.child(dir, "gallery.json"), body)
  return #items
end

local function collectionFolder(publishSettings, collectionName)
  local root = publishSettings.wgRoot
  if not root or root == "" then return nil end
  local dir = LrPathUtils.child(root, slugify(collectionName))
  LrFileUtils.createAllDirectories(dir)
  return dir
end

-- ---------- publishing ----------
function provider.processRenderedPhotos(functionContext, exportContext)
  local settings = exportContext.propertyTable
  local info = exportContext.publishedCollectionInfo
  local collectionName = (info and info.name) or "Gallery"
  local dir = collectionFolder(settings, collectionName)
  if not dir then
    LrDialogs.message("Choose a gallery folder first", "Edit the publish service settings and pick where your galleries go.", "warning")
    return
  end

  local held, published = {}, 0
  local session = exportContext.exportSession
  local total = session:countRenditions()
  local progress = exportContext:configureProgress {
    title = total > 1 and ("Publishing " .. total .. " photos to " .. collectionName) or ("Publishing one photo to " .. collectionName),
  }

  for _, rendition in exportContext:renditions { stopIfCanceled = true } do
    local photo = rendition.photo
    local title, caption, alt = field(photo, "title"), field(photo, "caption"), altText(photo)
    local fileLabel = field(photo, "fileName")

    local reason = nil
    if settings.wgRequireCaption and caption == "" then reason = "No caption yet. Add one in the Metadata panel, then publish again." end
    if not reason and settings.wgRequireAlt and alt == "" then reason = "No alt text yet. Add it in the Metadata panel, then publish again." end

    if reason then
      rendition:skipRender()
      rendition:uploadFailed(reason)
      held[#held + 1] = fileLabel ~= "" and fileLabel or ("photo " .. tostring(photo.localIdentifier))
    else
      local ok, pathOrMessage = rendition:waitForRender()
      if ok then
        local t = captureTime(photo)
        local stamp = t and LrDate.timeToUserFormat(t, "%Y%m%d%H%M%S") or "00000000000000"
        local base = stamp .. "-" .. tostring(photo.localIdentifier)
        local jpg = LrPathUtils.child(dir, base .. ".jpg")
        if LrFileUtils.exists(jpg) then LrFileUtils.delete(jpg) end
        LrFileUtils.move(pathOrMessage, jpg)

        local record = {
          id = base,
          file = base .. ".jpg",
          title = title,
          caption = caption,
          alt = alt,
          date = t and LrDate.timeToUserFormat(t, "%Y-%m-%d") or "",
          keywords = keywordList(photo),
          credit = field(photo, "creator"),
          copyright = field(photo, "copyright"),
          checked = caption ~= "",
        }
        writeFile(LrPathUtils.child(dir, base .. ".json"), "    " .. Json.encode(record, "    "))
        rendition:recordPublishedPhotoId(base)
        rendition:recordPublishedPhotoUrl(jpg)
        published = published + 1
      else
        rendition:uploadFailed(pathOrMessage)
      end
    end
  end

  local count = rebuildGallery(dir, collectionName)
  progress:done()

  if #held > 0 then
    local list = table.concat(held, ", ", 1, math.min(#held, 8)) .. (#held > 8 and (" and " .. (#held - 8) .. " more") or "")
    LrDialogs.message(
      collectionName .. ": " .. published .. " published, " .. #held .. " held back",
      "These need a caption before they can go out: " .. list .. ". The gallery now has " .. count .. " photos.",
      "info"
    )
  end
end

-- ---------- removing photos ----------
function provider.deletePhotosFromPublishedCollection(publishSettings, arrayOfPhotoIds, deletedCallback, localCollectionId)
  local catalog = LrApplication.activeCatalog()
  local coll = catalog:getPublishedCollectionByLocalIdentifier(localCollectionId)
  local name = coll and coll:getName() or "Gallery"
  local dir = collectionFolder(publishSettings, name)
  for _, id in ipairs(arrayOfPhotoIds) do
    if dir then
      for _, ext in ipairs { ".jpg", ".json" } do
        local p = LrPathUtils.child(dir, id .. ext)
        if LrFileUtils.exists(p) then LrFileUtils.delete(p) end
      end
    end
    deletedCallback(id)
  end
  if dir then rebuildGallery(dir, name) end
end

-- Renaming a collection renames its folder, so the website path follows.
function provider.renamePublishedCollection(publishSettings, info)
  local root = publishSettings.wgRoot
  if not root or root == "" or not info.publishedCollection then return end
  local oldDir = LrPathUtils.child(root, slugify(info.publishedCollection:getName()))
  local newDir = LrPathUtils.child(root, slugify(info.name))
  if LrFileUtils.exists(oldDir) and not LrFileUtils.exists(newDir) then
    LrFileUtils.move(oldDir, newDir)
    rebuildGallery(newDir, info.name)
  end
end

return provider
