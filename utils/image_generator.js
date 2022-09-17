var PImage = require("pureimage");
var fs = require("fs");
const logger = require("./logger");

module.exports = {
    genText: function (txt) {
        return new Promise((res, rej) => {
            var fnt = PImage.registerFont(
                "public/fonts/sourcesanspro.ttf",
                "Source Sans Pro"
            );
            fnt.load(() => {
                var img = PImage.make(150, 80);
                var ctx = img.getContext("2d");
                ctx.fillStyle = "#ccaaaa";

                ctx.font = "20pt 'Source Sans Pro'";
                ctx.fillText(txt, 30, 30);

                PImage.encodePNGToStream(img,
                    fs.createWriteStream(path.join(process.cwd(), "public", "img", "onu_status.png"))
                )
                    .then(() => {                        
                        res();
                    })
                    .catch((e) => {                        
                        rej(e);
                    });
            });
        });
    }
    
};
