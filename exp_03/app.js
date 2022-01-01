


$(function() {
    // onload
   
   
   
    function addCard(i, title, subtitle) {
        
        var res = `
                <div class="column col-12 col-xs-12">
                    <input type="checkbox" id="card-${i}">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title h5">
                                <label class="card-extend" for="card-${i}"><i class="icon icon-caret"></i>
                                    ${title}
                                </label>
                            </div>
                            <div class="card-subtitle text-gray">${subtitle}</div>
                        </div>
                        <div class="card-body">
                            <span class="timer">00:00</span>
                            <div class="question"></div>
                            <div class="answer-div">
                                <div class="divider text-left" data-content="答案"></div>
                                <div class="answer"></div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary" id="showans">显示答案</button>
                            <button class="btn" id="refresh"><i class="icon icon-refresh"></i>重新生成</button>
                        </div>
                    </div>
                </div>
        `;
        $('#cards').append(res);
         
        var card = $(`#card-${i} + .card`);
        card.find('.answer-div').css('display', 'none');
        // setup timer
        var timerjq = card.find('.timer');
        timerjq[0].time = 0;
        window.setInterval(function(){
            if (card.find('.answer-div').css('display') == 'none') {
                timerjq[0].time += 0.1;
                timerjq.text('t = ' + timerjq[0].time.toFixed(1));
            }
        }, 100);
        // listeners
        card.find('#showans').on('click', e => card.find('.answer-div').css('display' , ''));
        card.find('#refresh').on('click', e => initCard(i));
        card.find('.card-extend').on('click', e => initCard(i));
         
    }
    
    function initCard(i) {
        var [question, answer] = templates[i].gen(Math.floor(Math.random() * 23333));
        var card = $(`#card-${i} + .card`);
        card.find('.question').html('').append(question);
        card.find('.answer-div').css('display', 'none');
        card.find('.answer').html('').append(answer);
        card.find('.timer')[0].time = 0;
    }
    
    function tex2Elem(tex) {
        return MathJax.tex2svg(tex, {em: 16, ex: 6, display: false});
    }
    
    function randGen(seed){
        var s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280.0;
        };
    }
    
    function randMat(rows, cols, rand, maxabs) {
        var res = math.matrix(math.zeros([rows, cols]));
        
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++ ) {
                res.subset(math.index(i, j), Math.floor(rand() * (maxabs*2+1) - maxabs));
            }
        }
        
        return res;
    }
    
    function prettyStr(num, eps) {
        if (eps == null) eps = 1e-5;
        if (Math.abs(num - Math.round(num)) < eps) return Math.round(num).toString();
        for (var i = 2; i <= 10; i++) {
            var u = num * i;
            if (Math.abs(u - Math.round(u)) < eps) {
                return Math.round(u).toString() + '/' + i;
            }
        }
    }
    
    function mat2Tex(mat, toString) {
        "\\begin{bmatrix}-0.6666666666666667&1.3333333333333335&-1\\\\1&-2&1\\\\0&1&0\\\\\\end{bmatrix}";
        var res = '\\begin{bmatrix}';
        var [h, w] = mat.size();
        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                res += toString(mat.subset(math.index(i, j)));
                if (j < w - 1) {
                    res += '&';
                }
                else {
                    res += '\\\\';
                }
            }
        }
        res += '\\end{bmatrix}';
        return res;
    }
    
    var templates = [
        {
            title : '矩阵乘法',
            subtitle : '计算A*B',
            gen : function(seed) {
                var rand = randGen(seed);
                
                var baseSize = Math.floor(Math.pow(rand(), 0.5) * 2) + 2; // 2 or 3
                var resSize = Math.floor(rand() * baseSize) + 1; // 1 or 2 / 1 or 2 or 3
                
                var mat1 = randMat(baseSize, baseSize, rand, 4);
                var mat2 = randMat(baseSize, resSize, rand, 4);
                var res = math.multiply(mat1, mat2);
                var tex1 = math.parse(mat1.toString()).toTex();
                var tex2 = math.parse(mat2.toString()).toTex();
                var tex = math.parse(res.toString()).toTex();
                

                var question = $(`<p><span eq1></span></p>`);
                var answer = $(`<p><span eq1></span></p>`);
                
                question.find('span[eq1]').append(tex2Elem(tex1 + ' \\cdot ' + tex2));
                answer.find('span[eq1]').append(tex2Elem(tex));
                
                return [question, answer];
                
            },
        },
        {
            title : '矩阵求逆',
            subtitle : '计算A^-1',
            gen : function(seed) {
                var rand = randGen(seed);
                
                var mat;
                while (true) {
                    mat = randMat(3, 3, rand, 3);
                    var absdet = Math.abs(math.det(mat));
                    if (absdet < 1e-5 || absdet > 5) {
                        // remake
                    }
                    else {
                        break;
                    }
                }
                matinv = math.inv(mat);
                
                var tex1 = mat2Tex(mat, prettyStr);
                var tex2 = mat2Tex(matinv, prettyStr);
                
                var question = $(`<p><span eq1></span></p>`);
                var answer = $(`<p><span eq1></span></p>`);
                
                question.find('span[eq1]').append(tex2Elem(`${tex1} ^ {-1}`));
                answer.find('span[eq1]').append(tex2Elem(tex2));
                
                return [question, answer];
            },
        },
        {
            title : '系统的求解',
            subtitle : '给定系统、初值和输入，求x(t)、y(t)',
            gen : function(seed) {
                
                let question = 'WIP';
                let answer = 'WIP';
                return [question, answer];
            },
        },
        {
            title : '动态方程的实现',
            subtitle : '给定微分方程或传递函数，求系统的实现',
            gen : function(seed) {
                var rand = randGen(seed);
                // 0=微分方程
                // 1=传递函数
                var inputType = Math.floor(rand() * 2);
                // 0=可控
                // 1=可观
                // 2=jordan
                var outputType = Math.floor(rand() * 3);
                
                
                
                
                let question = 'WIP';
                let answer = 'WIP';
                
                return [question, answer];
            },
        },
    ];
    
    
    for (var i = 0; i < templates.length; i++) {
        addCard(i, templates[i].title, templates[i].subtitle);
    }
    window.addCard = addCard;
    
    
    console.log('hello');
    
});


