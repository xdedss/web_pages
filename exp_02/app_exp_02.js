



var app = {};


function tab(n){
    $('.tab-item').removeClass('active');
    $('.tab-item:nth-child('+n+')').addClass('active');
    $('.visible').css('display', 'none');
    $('.visible-' + n).css('display', '');
}

function initTab(){
    var targetTab = 1;
    if (location.hash != ''){
        var parsed = parseInt(location.hash.substr(1));
        if (!isNaN(parsed)) targetTab = parsed;
    }
    tab(targetTab);
}


$(function() {
    
//    
//    var a = events.registerArea($('#two')[0]);
//    a.registerListener([[50, 50],[100,100]], {
//        'mouseup' : function(e){console.log(e)},
//        'mousedown' : function(e){console.log(e)},
//        'click' : function(e){console.log('click')},
//        'contextmenu' : e=>{
//            e.preventDefault();
//            rmenu.showMenu('rmenu', e.clientX, e.clientY)
//        },
//    });
    
    var header = 36;
    
    updateList = [];
    removeList = [];
    
    function clamp(num, min, max){
        if (min > max) return clamp(num, max, min);
        if (num > max) return max;
        if (num < min) return min;
        return num;
    }    
    function insideRect(pX, pY, rX, rY, rW, rH){
        return pX >= rX && pY >= rY && pX <= rX + rW && pY <= rY + rH;
    }
    deg2rad = 3.141592653589793 / 180.0;
    
    function mergeInto(from, to){
        from.forEach(i=>to.add(i));
    }
    
    function getIDSet(logic, s){
        if (s === undefined) s = new Set();
        if (typeof(logic) == 'string'){
            s.add(logic);
        }
        else if (typeof(logic) == 'object'){
            for (var i = 1; i < logic.length; i++){
                getIDSet(logic[i], s);
            }
        }
        return s;
    }
    
    function bin(n, m){
        var res = n.toString(2);
        while(res.length < m){
            res = '0' + res;
        }
        return res;
    }
    
    var tableFormat = [
    0,
    {
        head : '$0\\',
        xnum : 0,
        ynum : 1,
        x : [0],
        y : [0, 1],
    },
    {
        head : '$1\\$0',
        xnum : 1,
        ynum : 1,
        x : [0, 1],
        y : [0, 1],
    },
    {
        head : '$2\\$1$0',
        xnum : 2,
        ynum : 1,
        x : [0, 1, 3, 2],
        y : [0, 1],
    },
    {
        head : '$3$2\\$1$0',
        xnum : 2,
        ynum : 2,
        x : [0, 1, 3, 2],
        y : [0, 1, 3, 2],
    },
    {
        head : '$4$3\\$2$1$0',
        xnum : 3,
        ynum : 2,
        x : [0, 1, 3, 2, 6, 7, 5, 4],
        y : [0, 1, 3, 2],
    },
    {
        head : '$5$4$3\\$2$1$0',
        xnum : 3,
        ynum : 3,
        x : [0, 1, 3, 2, 6, 7, 5, 4],
        y : [0, 1, 3, 2, 6, 7, 5, 4],
    },
    ];
    var colors = {
        1: '100, 255, 255',
        2: '100, 255, 100',
        4: '240, 240, 80',
        8: '255, 200, 80',
        16: '255, 120, 120',
        32: '255, 120, 255',
        64: '120, 120, 255',
    }
    function generateTable(logic){
        var order = Array.from(getIDSet(logic)).sort().reverse();
        var table = logicParser.evaluateTable(logic, order);
        //console.log(table);
        var cover = getCover(table).reverse();
        var format = tableFormat[order.length];
        var head = format.head;
        for (var i = 0; i < order.length; i++){
            head = head.replace('$'+i, order[i]);
        }
        var circlesArr = [];
        var simplified = [];
        for (var i = 0; i < table.length; i++){
            circlesArr.push([]);
        }
        for (var i = 0; i < cover.length; i++){
            simplified.push(`<div cover="${i}" class="res">${IDToExp(cover[i], order)}</div>`);
            var group = IDContent(cover[i]);
            //console.log(group);
            for (var gi = 0; gi < group.length; gi++){
                var id = group[gi];
                //console.log('proc ' + id);
                var idNum = parseInt(id, 2);
                var sx = id.substr(format.ynum);
                var sy = id.substr(0, format.ynum);
                //console.log('sx sy ' + sx + ' ' + sy)
                var ix = parseInt(sx, 2);
                var iy = parseInt(sy, 2);
                var idTop = bin(loopGet(format.y, findIndex(iy, format.y)-1), format.ynum) + sx;
                var idBottom = bin(loopGet(format.y, findIndex(iy, format.y)+1), format.ynum) + sx;
                var idLeft = sy + bin(loopGet(format.x, findIndex(ix, format.x)-1), format.xnum);
                var idRight = sy + bin(loopGet(format.x, findIndex(ix, format.x)+1), format.xnum);
                //console.log('t b l r:' + idTop + ' ' + idBottom + ' ' + idLeft + ' ' + idRight);
                var connections = '';
                if (findIndex(idTop, group) >= 0) connections += ' top';
                if (findIndex(idBottom, group) >= 0) connections += ' bottom';
                if (findIndex(idLeft, group) >= 0) connections += ' left';
                if (findIndex(idRight, group) >= 0) connections += ' right';
                circlesArr[idNum].push([colors[group.length], connections, i]);
            }
        }
        return [`
        <table class="table">
            <tr>
                <td>${head}</td>${(s=>(format.x.forEach(x=>s+="<td>"+bin(x,format.xnum)+"</td>"),s))('')}
            </tr>
            ${(s=>(format.y.forEach(y=>s+="<tr>"+"<td>"+bin(y,format.ynum)+"</td>"+
                (s=>(format.x.forEach(x=>{
                    var index = y*format.x.length+x;
                    var truth = table[index];
                    //console.log(index);
                    var circles = circlesArr[index];
                    s+="<td id=\"slot"+(index)+"\">"+"<span>"+(truth ? 1 : 0)+"</span>"+
                    (s=>(circles.forEach(circle=>s+='<div cover="'+circle[2]+'" class="one-circle '+circle[1]+'" style="border-color:rgb('+circle[0]+');background-color:rgba('+circle[0]+',0.2);"></div>'),s))('')+
                    "</td>";
                }),s))('')+
                "</tr>"),s))('')}
        </table>
    
        `,`
        =${simplified.length == 0 ? 0 : simplified.join('+')}
    `];
    }
    
    function tryTable(){
        try{
            var [table, res] = generateTable(logicParser.parseLogic($('#input-logic').val()));
            $('#table-div').html(table).removeClass('error').addClass('ok');
            $('#res-div').html(res);
            $('#table-out div[cover]').mouseenter(e=>{
                var coverId = e.target.getAttribute('cover');
                $('#table-out div[cover='+coverId+']').addClass('highlight');
            }).mouseleave(e=>{
                var coverId = e.target.getAttribute('cover');
                $('#table-out div[cover='+coverId+']').removeClass('highlight');
            });
        }
        catch(e){
            $('#table-div').html(e).removeClass('ok').addClass('error')
            $('#res-div').html('');
            console.log(e);
        }
    }
    
    function findIndex(item, arr){
        for (var i = 0; i < arr.length; i++){
            if (arr[i] == item){
                return i;
            }
        }
        return -1;
    }
    
    function loopGet(arr, index){
        if (arr.length == 0) throw "arr.length == 0";
        while (index < 0) index += arr.length;
        while (index >= arr.length) index -= arr.length;
        return arr[index];
    }
    
    //ID转化为表达式
    function IDToExp(id, order){
        var res = '';
        for (var i = 0; i < order.length && i < id.length; i++){
            switch (id[id.length-1 - i]){
                case '1':
                    res = order[i] + res;
                    break;
                case '0':
                    res = order[i] + "'" + res;
                    break;
                default:
                    break;
            }
        }
        if (res == '') res = 1;
        return res;
    }
    
    //ID分解
    function IDContent(id){
        for (var i = 0; i < id.length; i++){
            if (id[i] == 'x'){
                return IDContent(id.substr(0,i)+'0'+id.substr(i+1)).concat(IDContent(id.substr(0,i)+'1'+id.substr(i+1)));
            }
        }
        return [id];
    }
    
    //ID比较
    function IDDifference(id1, id2){
        //console.log(id1 + '|' + id2)
        if (id1.length != id2.length) return;
        var res = [];
        for (var i = 0; i < id1.length; i++){
            if (id1[i] != id2[i]){
                res.push([i, id1[i], id2[i]]);
            }
        }
        return res;
    }
    
    //ID包含关系
    function IDContains(idLarge, idSmall){
        var diff = IDDifference(idLarge, idSmall);
        for (var i = 0; i < diff.length; i++){
            if (diff[i][1] != 'x') return false;
        }
        return true;
    }
    
    //能否合并，若能则返回合并后字符串
    function IDMerge(id1, id2){
        var diff = IDDifference(id1, id2);
        if (diff.length != 1) return false;
        return id1.substr(0, diff[0][0]) + 'x' + id1.substr(diff[0][0]+1);
    }
    
    //简化
    function getCover(truthTable){
        var varNum = 0;
        var tLen = truthTable.length >> 1;
        while(tLen) {
            tLen = tLen >> 1;
            varNum++;
        }
        var marks = {
            marks:{},
            add:function(id){
                for (var idSmall in this.marks){
                    if (IDContains(id, idSmall)){
                        this.marks[idSmall]++;
                    }
                }
            },
            minus:function(id){
                for (var idSmall in this.marks){
                    if (IDContains(id, idSmall)){
                        this.marks[idSmall]--;
                    }
                }
            },
            getMin:function(id){
                var res = Infinity;
                for (var idSmall in this.marks){
                    if (IDContains(id, idSmall)){
                        res = Math.min(res, this.marks[idSmall]);
                    }
                }
                return res;
            },
        };
        var sets = [new Set()];
        for (var i = 0; i < (1 << varNum); i++){
            if (truthTable[i]){
                var id = bin(i, varNum);
                sets[0].add(id);
                marks.marks[id] = 1;
            }
        }
        for (var k = 1; k <= varNum; k++){
            var set = new Set();
            var prev = Array.from(sets[k-1]);
            for (var i = 0; i < prev.length - 1; i++){
                for (var j = i+1; j < prev.length; j++){
                    var merged = IDMerge(prev[i], prev[j]);
                    if (merged && !set.has(merged)){
                        set.add(merged);
                        marks.add(merged);
                    }
                }
            }
            sets.push(set);
        }
        var res = [];
        for (var k = 0; k <= varNum; k++){
            var setArr = Array.from(sets[k]);
            setArr.forEach(id=>{
                if (marks.getMin(id) > 1){
                    marks.minus(id);
                    sets[k].delete(id);
                    //console.log(id);
                }
            });
            res = res.concat(Array.from(sets[k]));
        }
        return res;
    }
    
    
    $('#input-logic').bind('input propertychange',tryTable).val("A^(B+C'D)");
    tryTable();
    
    rmenu.buildMenu('rmenu', [['重新生成卡诺图(R)', '', 'r', tryTable, true]]);
    $('#table-out').contextmenu(e=>(rmenu.showMenu('rmenu', e.clientX, e.clientY),false));
    
    window.onhashchange = initTab;
    initTab();
    
});

