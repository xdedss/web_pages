


//(╯‵□′)╯︵┻━┻

$(function(){
    
    function reshape(){
        $('#inputimg').css('height', $('#inputimg').width() + 'px');
        $('#outputimg').css('height', $('#outputimg').width() + 'px');
    }
    
    function clearError(){
        $('#fileinputgroup').removeClass('has-error');
        $('#fileinputgroup .form-input-hint').html('');
        $('#parbingroup').removeClass('has-error');
        $('#parbingroup .form-input-hint').html('');
        $('#parwidthgroup').removeClass('has-error');
        $('#parwidthgroup .form-input-hint').html('');
        $('#parcellgroup').removeClass('has-error');
        $('#parcellgroup .form-input-hint').html('');
    }
    
    // 根据数据类型取合适的指针
    function correctPtr(mat){
        switch(mat.type() % 8){
            case 0: // 8U
                return mat.ptr.bind(mat);
                break;
            case 1: // 8S
                return mat.charPtr.bind(mat);
                break;
            case 2: // 16U
                return mat.ushortPtr.bind(mat);
                break;
            case 3: // 16S
                return mat.shortPtr.bind(mat);
                break;
            case 4: // 32S
                return mat.intPtr.bind(mat);
                break;
            case 5: // 32F
                return mat.floatPtr.bind(mat);
                break;
            case 6: // 64F
                return mat.doublePtr.bind(mat);
                break;
        }
        return mat.floatPtr.bind(mat);
    }
    
    // 逐像素灰度映射
    function mapMatGs(mat, mapper){
        var channels = mat.channels();
        mapMat(mat, (ptr, res)=>{
            for (var ci = 0; ci < channels; ci++){
                res[ci] = mapper(ptr[ci]);
            }
        });
    }
    
    // 逐像素映射
    function mapMat(mat, mapper){
        var cols = mat.cols;
        var rows = mat.rows;
        var ptrGetter = correctPtr(mat);
        var ptr;
        var res = [0,0,0,0];
        var channels = mat.channels();
        for (var r = 0; r < rows; r++){
            for (var c = 0; c < cols; c++){
                ptr = ptrGetter(r, c);
                mapper(ptr, res);
                for (var ci = 0; ci < channels; ci++){
                    ptr[ci] = res[ci];
                }
            }
        }
    }
    
    // 数组除以模
    function normalizeArr(arr, res){
        var sqrsum = 0;
        for (var i = 0; i < arr.length; i++){
            sqrsum += arr[i] * arr[i];
        }
        var mag = Math.sqrt(sqrsum);
        res = res || [];
        if (mag == 0){
            for (var i = 0; i < arr.length; i++){
                res[i] = 1 / Math.sqrt(arr.length);
            }
            return res;
        }
        for (var i = 0; i < arr.length; i++){
            res[i] = arr[i] / mag;
        }
        return res;
    }
    
    // 计算一块区域的直方图
    function localHOG(mag, angle, numBins){
        var cols = mag.cols;
        var rows = mag.rows;
        var magPtrGetter = correctPtr(mag);
        var anglePtrGetter = correctPtr(angle);
        var m, a, bin, binfrac;
        var res = [];
        for (var i = 0; i < numBins; i++) res[i] = 0;
        for (var r = 0; r < rows; r++){
            for (var c = 0; c < cols; c++){
                m = magPtrGetter(r, c)[0];
                a = anglePtrGetter(r, c)[0];
                binfrac = (a % 180) / 180.0 * numBins;
                bin = Math.floor(binfrac);
                binfrac -= bin;
                res[bin] += (1-binfrac) * m;
                res[(bin >= numBins - 1) ? 0 : (bin+1)] += binfrac * m;
            }
        }
        return res;
    }
    
    // concatenate
    function cat(arrarr){
        var res = [];
        for (var i = 0; i < arrarr.length; i++){
            for (var j = 0; j < arrarr[i].length; j++){
                res.push(arrarr[i][j]);
            }
        }
        return res;
    }
    
    function mainProcess(imWidth, imHeight, cellSize, numBins){
    
        // 读入图片
        let mat = cv.imread($('#hidden')[0]);
        // 调整大小
        cv.resize(mat, mat, new cv.Size(imHeight, imWidth));
        
        // 可视化用画布
        let visualize = new cv.Mat();
        mat.copyTo(visualize);
        // 淡化底图
        mapMat(visualize, (ptr, res) => {
            const fade = 3;
            res[0] = Math.floor(ptr[0] / fade);
            res[1] = Math.floor(ptr[1] / fade);
            res[2] = Math.floor(ptr[2] / fade);
            res[3] = 255;
        });
        
        // 转灰度
        let gs = new cv.Mat();
        cv.cvtColor(mat, gs, cv.COLOR_BGR2GRAY);
        
        //计算梯度
        let gx = new cv.Mat();
        let gy = new cv.Mat();
        cv.Sobel(gs, gx, cv.CV_32F, 1, 0, 1);
        cv.Sobel(gs, gy, cv.CV_32F, 0, 1, 1);
        
        // 计算模长和角度
        let mag = new cv.Mat();
        let angle = new cv.Mat();
        cv.cartToPolar(gx, gy, mag, angle, 1);
        
        // cell数量和窗口滑动步数
        var cellRows = imHeight / cellSize;
        var cellCols = imWidth / cellSize;
        var slideRows = cellRows - 1;
        var slideCols = cellCols - 1;
        
        // 统计每一个cell的直方图
        var hogDict = {};
        for (var cr = 0; cr < cellRows; cr++){
            for (var cc = 0; cc < cellCols; cc++){
                let windowRect = new cv.Rect(cr * cellSize, cc * cellSize, cellSize, cellSize);
                let angleWindow = angle.roi(windowRect);
                let magWindow = mag.roi(windowRect);
                var hog = localHOG(magWindow, angleWindow, numBins);
                hogDict[cr+'|'+cc] = hog;
            }
        }
        
        //按照每一个小cell标准化并可视化
        var normalBuffer = []
        for (var i = 0; i < numBins; i++) normalBuffer[i] = 0;
        for (var cr = 0; cr < cellRows; cr++){
            for (var cc = 0; cc < cellCols; cc++){
                var centerX = cc * cellSize + cellSize / 2;
                var centerY = cr * cellSize + cellSize / 2;
                var hog = hogDict[cr+'|'+cc];
                normalizeArr(hog, normalBuffer);
                for (var anglei = 0; anglei < numBins; anglei++){
                    var curangle = anglei * Math.PI / numBins;
                    var length = cellSize * 0.7 * normalBuffer[anglei];
                    var dx = length * Math.cos(curangle);
                    var dy = -length * Math.sin(curangle);
                    cv.line(visualize, new cv.Point(centerY + dy, centerX + dx), new cv.Point(centerY - dy, centerX - dx), new cv.Scalar(255, 255, 255, 255));
                }
            }
        }
        
        //按照block标准化连接得到最终结果
        var res = []
        for (var i = 0; i < numBins; i++) normalBuffer[i] = 0;
        for (var cr = 0; cr < slideRows; cr++){
            for (var cc = 0; cc < slideCols; cc++){
                var hog = cat([hogDict[cr+'|'+cc], hogDict[(cr+1)+'|'+cc], hogDict[(cr+1)+'|'+cc], hogDict[(cr+1)+'|'+(cc+1)]]);
                res.push(normalizeArr(hog));
            }
        }
        res = cat(res);
        var resstr = '';
        resstr += '结果为' + res.length + '维向量<br>';
//        for (var i = 0; i < res.length; i++){
//            resstr += res[i] + ', '
//        }
        $('#result').html(resstr);
        
        //let res = new cv.Mat();
        //console.log(mat.size());
        
        //process
        //cv.blur(mat, res, new cv.Size(5, 5));
        //mapMatGs(mag, c => c /255);
        //mapMatGs(angle, c => c / 360);
        
        cv.imshow('inputimg', mat);
        cv.imshow('outputimg', visualize);
        
        mat.delete();
        visualize.delete();
        gs.delete();
        gx.delete();
        gy.delete();
        mag.delete();
        angle.delete();
        //res.delete();
    }
    
    $(window).on('resize', reshape);
    
    $('#loaded').css('display', 'none');
    $('#cvjs').on('load', function(){
        $('#loading').css('display', 'none');
        $('#loaded').css('display', '');
        reshape();
        
        $('#fileinput, #parbin, #parcell, #parwidth').on('change', e=>{
            clearError();
        });
        
        $('#go').on('click', e=>{
            if ($('#fileinput')[0].files.length > 0){
                $('#hidden').attr('src', URL.createObjectURL($('#fileinput')[0].files[0]))
            }
            else{
                $('#fileinputgroup').addClass('has-error');
                $('#fileinputgroup .form-input-hint').html('无效文件');
            }
        });
        
        $('#hidden').on('load', e=>{
            var numBins = parseInt($('#parbin').val());
            var cellSize = parseInt($('#parcell').val());
            var imWidth = parseInt($('#parwidth').val());
            var imHeight = parseInt($('#parwidth').val());
//            console.log(numBins);
//            console.log(cellSize);
//            console.log(imHeight);

            if (!(imWidth > 0)){
                $('#parwidthgroup').addClass('has-error');
                $('#parwidthgroup .form-input-hint').html('无效数字');
                return;
            }
            if (imWidth > 1024){
                $('#parwidthgroup').addClass('has-error');
                $('#parwidthgroup .form-input-hint').html('width <= 1024');
                return;
            }
            if (!(cellSize > 0)){
                $('#parcellgroup').addClass('has-error');
                $('#parcellgroup .form-input-hint').html('无效数字');
                return;
            }
            
            if (imWidth % cellSize != 0){
                $('#parwidthgroup').addClass('has-error');
                $('#parcellgroup').addClass('has-error');
                $('#parcellgroup .form-input-hint').html('width必须能被cell整除');
                return;
            }
            
            if (!(numBins > 0)){
                $('#parbingroup').addClass('has-error');
                $('#parbingroup .form-input-hint').html('无效数字');
                return;
            }
            
            clearError();
            
            mainProcess(imWidth, imHeight, cellSize, numBins)
            
        });
    });
})

