

$(function(){
    
    //var a = document.createElement('a');
    var fname = '*';
    var needRerender = true;

    $('#spacing').change(function(e) {
        var v = $('#spacing')[0].value;
        $('#spacing-label').html(v+'px');
        $('#pre').css('letter-spacing', v+'px');
        resetDownload();
    });

    $('#scale').change(function(e) {
        var v = Number($('#scale')[0].value);
        v = Math.pow(2, v / 100.0);
        $('#scale-label').html(v.toFixed(2));
        $('#pre').css('transform', `scale(${v}) translate(${-100*(1-v)/v/2}%, ${-100*(1-v)/v/2}%)`);
        resetDownload();
    });

    $('#charset').keyup(function(e){
        redraw();
    }).change(function(e){
        redraw();
    });

    $('#upload').change(function(e) {
        var file = $('#upload').val();
        fname = file.replace(/^.+?\\([^\\]+?)(\.[^\.\\]*?)?$/gi,"$1");
        //var FileExt = file.replace(/.+\./,"");
        
        redraw();
    });
    
    $('#btn-download').click(function(e){
        if (needRerender){
            needRerender = false;
            updateLink();
            e.preventDefault();
        }
        
    });

    function clamp(f, min, max){
        if (min > max) return clamp(f, max, min);
        if (f < min) return min;
        if (f > max) return max;
        return f;
    }

    function createSampler(data, w, h){
        return {
            sample : function(x, y){
                x = clamp(x, 0, w - 1);
                y = clamp(y, 0, h - 1);
                var i = (y * w + x) * 4;
                return {
                    r : data[i],
                    g : data[i+1],
                    b : data[i+2],
                    a : data[i+3],
                }
            },
            
            put : function(x, y, r, g, b, a){
                x = clamp(x, 0, w - 1);
                y = clamp(y, 0, h - 1);
                var i = (y * w + x) * 4;
                if (r != null) data[i] = r;
                if (g != null) data[i+1] = g;
                if (b != null) data[i+2] = b;
                if (a != null) data[i+3] = a;
            },
        }
    }

    function redraw(){
        var file = $('#upload')[0].files[0];
        if (file == null) return;
        
        var reader = new FileReader();
        var img = new Image();
        reader.readAsDataURL(file);
        reader.onload = function(e){
            img.src = reader.result;
            img.onload = function(e){
                processImage(img);
            }
        }
    }

    function processImage(img){
        var scale = clamp(200.0 / img.width, 0, 1);
        var resizedW = Math.floor(img.width * scale);
        var resizedH = Math.floor(img.height * scale);
        
        var canvas = $('#canvas')[0];
        canvas.width = resizedW;
        canvas.height = resizedH;
        var ctx = canvas.getContext('2d');
        
        
        ctx.drawImage(img, 0, 0, resizedW, resizedH);
        var imgData = ctx.getImageData(0, 0, resizedW, resizedH)
        var data = imgData.data;
        var sampler = createSampler(data, resizedW, resizedH);
        
        var res = '';
        var background = { r : 255, g : 255, b : 255, a : 255 };
        for (var y = 0; y < resizedH; y++){
            for (var x = 0; x < resizedW; x++){
                var col = sampler.sample(x, y);
                res += color2char(blend(background, col, col.a / 255.0));
            }
            res += '\n';
        }
        //ctx.putImageData(imgData, 0, 0);
        
        $('#pre').html(res);
        
        resetDownload();
    }
    
    function resetDownload(){
        $('#btn-download').html('渲染为图片');
        needRerender = true;
    }
    resetDownload();
    
    function updateLink(){
        $('#btn-download').addClass('loading').addClass('disabled');
        var [temp1, temp2, temp3] = [window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop];
        [window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop] = [0, 0, 0];
        html2canvas(document.querySelector("#pre")).then(canvas => {
            //document.body.appendChild(canvas)
            $('#btn-download').removeClass('loading').removeClass('disabled');
            [window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop] = [temp1, temp2, temp3];
            var a = $('#btn-download')[0];
            a.href = canvas.toDataURL("image/png");
            a.download = fname + '_ascii.png';
            a.dataset.downloadurl = ["image/png", a.download, a.href].join(':');
            a.innerHTML = '下载图片';
            //a.click();
        });
    }
    
    function color2char(c){
        var gs = (c.r*0.299 + c.g*0.587 + c.b*0.114) / 255.0;
        var chars = $('#charset')[0].value;
        if (chars == '' || chars == null) chars = '@B%8W#hwmQkbZ0LOCJUYXjtzcvn/|1{}[]?!+-~;:, ';
        var ch = chars[clamp(Math.floor(gs * chars.length), 0, chars.length - 1)];
        
        return ch;
    }

    function lerp(f1, f2, t){
        return f1 * (1-t) + f2 * t;
    }

    function blend(c1, c2, t){
        return {
            r : Math.round(lerp(c1.r, c2.r, t)),
            g : Math.round(lerp(c1.g, c2.g, t)),
            b : Math.round(lerp(c1.b, c2.b, t)),
            a : Math.round(lerp(c1.a, c2.a, t)),
        }
    }
    
});