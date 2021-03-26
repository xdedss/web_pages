
(function($){
    
$(function(){
    
    var numlines = 100;
    var currentIndex = 0;
    var pxPerSec = 100;
    for (var i = 0; i < numlines; i++){
        $('#scroll').append('<span class="mark" id="mark' + i + '" style="display:none" ></span>');
    }
    
    function lerp(f1, f2, t){
        return f1 * (1-t) + f2 * t;
    }
    
    marks = [];
    
    function addMark(startTime, color){
        if (marks.length >= numlines){
            removeLastMark();
        }
        marks.push({
            index : currentIndex,
            startTime : startTime
        })
        $('#mark' + currentIndex).css('display', '').css('left', '0').css('background-color', color);
        currentIndex++;
        currentIndex %= numlines;
    }
    
    function removeLastMark(){
        lastMark = marks.shift();
        $('#mark' + lastMark.index).css('display', 'none');
    }
    
    function updateMarks(){
        var now = Date.now();
        for (var i = 0; i < marks.length; i++){
            var mark = marks[i];
            $('#mark' + mark.index).css('left', ((now - mark.startTime) / 1000.0 * pxPerSec) + 'px');
        }
        var maxTime = $('#scroll').width() / pxPerSec;
        if (marks.length > 0 && (now - marks[0].startTime) > (1000 * maxTime)){
            removeLastMark();
        }
    }
    
    function updateDisplay(){
        var bpm = 60 / intervalAvg;
        bpm = Math.round(bpm * 1000) / 1000;
        $('#tempo').text(bpm);
    }
    
    var lastbeat = 0;
    var intervalBuffer = [];
    var intervalAvg = 1;
//    var intervalEst = 1;
//    var intervalEstVar = 0.5; // sqr
//    var intervalMeasured = 1;
//    var intervalMeasuredVar = 0.1;
    function beat(){
        var thisbeat = Date.now();
        var dt = (thisbeat - lastbeat) / 1000.0;
        
        if (dt > intervalAvg * 3 || dt > 2) {
            // new segment
//            intervalEst = 1;
//            intervalEstVar = 0.5;
            intervalBuffer = [];
            intervalAvg = 1;
            
            addMark(thisbeat, '#f88');
            updateDisplay();
        }
        else if(dt < 0.2) {
            // §¯§Ö§ä
            console.log('too fast');
            addMark(thisbeat, '#eee');
            return;
        }
        else{
            // karman
//            intervalEstVar *= Math.exp(dt / 10)
//            var d = intervalEstVar + intervalMeasuredVar;
//            intervalMeasured = dt;
//            intervalEst = lerp(intervalEst, intervalMeasured, intervalEstVar / d);
//            intervalEstVar = (intervalEstVar * intervalMeasuredVar * intervalMeasuredVar + intervalEstVar * intervalEstVar * intervalMeasuredVar) / (d * d);
//            console.log(`measured:${60/intervalMeasured}\nbpmEst:${60/intervalEst}, var:${intervalEstVar}`);
            // avg
            if (intervalBuffer.length >= 128){
                intervalBuffer.shift();
            }
            intervalBuffer.push(dt);
            intervalAvg = 0;
            for (var i = 0; i < intervalBuffer.length; i++){
                intervalAvg += intervalBuffer[i];
            }
            intervalAvg /= intervalBuffer.length;
            
            addMark(thisbeat, '#888');
            updateDisplay();
        }
        
        lastbeat = thisbeat;
    }
    
    
    
    
    
    setInterval(updateMarks, 20);
    
    //kb.onKeyDown('Space', beat);
    $(document).on('keydown', beat);
    $('#hit').on('pointerdown', beat);
});

})(jQuery);