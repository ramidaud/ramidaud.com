--[[ Library > Plug-in Extras > Web Gallery: Approve drafts for selected photos
  For each selected photo with a draft: the draft title, caption and keywords become the real ones,
  approved alt text is saved, and Gallery status becomes "Approved". Edit the drafts first if
  anything is wrong; whatever is in the draft fields is what gets approved.
  A draft still containing [?] is not approved: something in it needs a person to confirm it.
]]
local LrApplication = import "LrApplication"
local LrDialogs = import "LrDialogs"
local LrTasks = import "LrTasks"

local C = require "Common"

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local photos = catalog:getTargetPhotos()
  if #photos == 0 then
    LrDialogs.message("Select the photos to approve first", nil, "info")
    return
  end

  local approved, unsure, nodraft = 0, {}, {}
  catalog:withWriteAccessDo("Web Gallery: approve drafts", function()
    for _, photo in ipairs(photos) do
      local title, caption = C.prop(photo, "wgDraftTitle"), C.prop(photo, "wgDraftCaption")
      local alt, kws = C.prop(photo, "wgDraftAlt"), C.prop(photo, "wgDraftKeywords")
      local hasDraft = (caption ~= "" or title ~= "" or alt ~= "" or kws ~= "")
      local combined = title .. " " .. caption .. " " .. alt .. " " .. kws
      if not hasDraft and C.field(photo, "caption") == "" then
        nodraft[#nodraft + 1] = C.fileLabel(photo)
      elseif string.find(combined, "[?]", 1, true) then
        unsure[#unsure + 1] = C.fileLabel(photo)
      else
        if title ~= "" then photo:setRawMetadata("title", title) end
        if caption ~= "" then photo:setRawMetadata("caption", caption) end
        if alt ~= "" then
          photo:setPropertyForPlugin(_PLUGIN, "wgAlt", alt)
          pcall(photo.setRawMetadata, photo, "altTextAccessibility", alt)
        end
        for raw in string.gmatch(kws, "[^,]+") do
          local name = C.trim(raw)
          if name ~= "" then
            local kw = catalog:createKeyword(name, {}, true, nil, true)
            if kw then photo:addKeyword(kw) end
          end
        end
        photo:setPropertyForPlugin(_PLUGIN, "wgStatus", "approved")
        approved = approved + 1
      end
    end
  end, { timeout = 60 })

  local notes = {}
  if #unsure > 0 then notes[#notes + 1] = #unsure .. " still have a [?] to confirm: " .. table.concat(unsure, ", ", 1, math.min(#unsure, 8)) end
  if #nodraft > 0 then notes[#notes + 1] = #nodraft .. " have no draft or caption yet: " .. table.concat(nodraft, ", ", 1, math.min(#nodraft, 8)) end
  LrDialogs.message(approved .. " approved", #notes > 0 and table.concat(notes, "\n\n") or "They're ready to publish.", "info")
end)
