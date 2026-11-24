--[[ Publish to Web Gallery
     A Lightroom Classic publish service. Each published collection becomes a folder of
     web-sized JPEGs plus gallery.json (title, caption, alt text, date, keywords).
     Photos without a caption are held back, so a person signs off on every photo that goes out.
     By Rami Daud. Built with Claude. MIT license. ]]
return {
  LrSdkVersion = 10.0,
  LrSdkMinimumVersion = 6.0,
  LrToolkitIdentifier = "com.ramidaud.webgallery",
  LrPluginName = "Publish to Web Gallery",
  LrPluginInfoUrl = "https://ramidaud.com/work/lightroom-archive/",
  LrExportServiceProvider = {
    title = "Web Gallery",
    file = "WebGalleryServiceProvider.lua",
  },
  VERSION = { major = 0, minor = 1, revision = 0, build = 1 },
}
