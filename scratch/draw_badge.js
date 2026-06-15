ObjC.import('AppKit');

var width = 96;
var height = 96;
var rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(
    $.nil, width, height, 8, 4, true, false, "NSDeviceRGBColorSpace", width * 4, 32
);

var ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep);
$.NSGraphicsContext.saveGraphicsState;
$.NSGraphicsContext.setCurrentContext(ctx);

var rect = $.NSMakeRect(0, 0, width, height);
$.NSColor.clearColor.set;
$.NSRectFill(rect);

var text = "f";
var font = $.NSFont.fontWithName_size("Georgia", 72) || $.NSFont.systemFontOfSize(72);
var color = $.NSColor.whiteColor;
var attrs = $.NSDictionary.dictionaryWithObjects_forKeys(
    [font, color],
    [$.NSFontAttributeName, $.NSForegroundColorAttributeName]
);

var string = $.NSString.stringWithString(text);
var size = string.sizeWithAttributes(attrs);

var drawRect = $.NSMakeRect(
    (width - size.width) / 2,
    (height - size.height) / 2 - 12,
    size.width,
    size.height
);

string.drawInRect_withAttributes(drawRect, attrs);

$.NSGraphicsContext.restoreGraphicsState;

// NSPNGFileType has integer value 4 in AppKit
var data = rep.representationUsingType_properties(4, $.nil);
data.writeToFile_atomically("/Users/simpleneeraj/Ideas/imessage-clone/public/logo/badge-72.png", true);
console.log("Success");
