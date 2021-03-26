// requires jQuery

// Chrome style right click menu
// xdedss 2020
// MIT License

var rmenu = {};

(function($){
    
    function fake_click(obj) {
        var ev = document.createEvent("MouseEvents");
        ev.initMouseEvent(
            "click", true, false, window, 0, 0, 0, 0, 0
            , false, false, false, false, 0, null
            );
        obj.dispatchEvent(ev);
    }
    
    function export_raw(name, data) {
        var urlObject = window.URL || window.webkitURL || window;
     
        var export_blob = new Blob([data]);
     
        var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
        save_link.href = urlObject.createObjectURL(export_blob);
        save_link.download = name;
        fake_click(save_link);
    }
    
    
    var defaultMenu = [
    ['返回(B)', 'Alt+向左箭头', 'b', e=>{}, false],
    ['前进(F)', 'Alt+向右箭头', 'f', e=>{}, false],
    ['重新加载(R)', 'Ctrl+R', 'r', e=>{document.location=document.location}, true],
    [],
    ['另存为(A)...', 'Ctrl+S', 'a', e=>{export_raw(document.title+'.html', $('html').html());}, true],
    ['打印(P)...', 'Ctrl+P', 'p', e=>{print()}, true],
    ['投射(C)...', '', 'c', e=>{}, true],
    [],
    ['查看网页源代码(V)', 'Ctrl+U', 'v', e=>{}, true],
    ['检查(N)', 'Ctrl+Shift+I', 'n', e=>{}, true],
    [],
    ['（这是一个假的右键菜单）', '', '', e=>{}, false],
    ]
    
    var activeId = null;
    
    function buildMenu(id, data){
        if (data === undefined) data = defaultMenu;
        res = '';
        if ($('#'+id).length == 0){
            $('body').append(`<div class="r-menu" id="${id}"></div>`)
        }
        if ($('head #rmenu-style').length == 0){
            $('head').append(`
            <style id="rmenu-style">
                .r-menu{
                    width: 250px;
                    box-sizing: border-box;
                    padding: 3px 0px 4px 0px;
                    overflow: hidden;
                    border:1px solid #ddd;
                    box-shadow: 3px 3px 2px -2px #666;
                    position: fixed;
                    cursor: default;
                    user-select: none;
                    background: #fff;
                    z-index: 100;
                }
                .r-menu .r-menu-item{
                    box-sizing: border-box;
                    color: #000;
                    font-size: 11.8px;
                    font-family: sans-serif;
                    width: 100%;
                    height: 24px;
                    line-height: 24px;
                    padding: 0 30px 0 25px;
                }
                .r-menu .r-menu-item:hover:not(.disabled){
                    background-color: #ccc;
                }
                .r-menu .r-menu-item.disabled{
                    color: #888;
                }
                .r-menu .r-menu-item span{
                    float: right;
                }
                .r-menu .r-menu-div{
                    margin: 5.5px 0 5.5px 0;
                    width: 100%;
                    height: 1px;
                    background: #e4e4e4;
                }
            </style>
            `);
        }
        root = $('#'+id);
        for (var i = 0; i < data.length; i++){
            if (data[i].length == 5){
                res += `<div class="r-menu-item${data[i][4] ? '' : ' disabled'}" key="${data[i][2]}">${data[i][0]}<span>${data[i][1]}</span></div>`;
            }
            else{
                res += `<div class="r-menu-div"></div>`;
            }
        }
        root.html(res);
        for (var i = 0; i < data.length; i++){
            if (data[i].length == 5 && data[i][4]){
                $(`#${id} > div:nth-child(${i+1})`).on('click', e=>{hideMenu(id)}).on('click', data[i][3]);
            }
        }
        root.on('contextmenu', e=>false).on('mousedown', e=>false);
        hideMenu(id);
    }
    
    function showMenu(id, posX, posY){
        menu = $('#'+id);
        if (menu.length > 0){
            if (posX + menu[0].offsetWidth > $(window).width()){
                posX = $(window).width() - menu[0].offsetWidth;
            }
            if (posY + menu[0].offsetHeight > $(window).height()){
                posY -= menu[0].offsetHeight;
            }
            menu.css('left', posX).css('top', posY);
            activeId = id;
        }
    }
    
    function hideMenu(id){
        if (id === undefined){
            col = $('.r-menu');
            for (var i = 0; i < col.length; i++){
                $(col[i]).css('left', -2*$(col[i]).width());
            }
        }
        else{
            $('#'+id).css('left', -2*$('#'+id).width());
        }
        activeId = null;
    }
    
    $(function(){
        $('body').mousedown(e=>{
            hideMenu();
        });
        $(window).scroll(e=>{
            hideMenu();
        }).on('keydown', e=>{
            if (activeId !== null){
                $(`#${activeId} > div[key=${e.key}]`).trigger('click');
            }
        }).on('visibilitychange', e=>{
            hideMenu();
        });
    });
    
    rmenu.buildMenu = buildMenu;
    rmenu.hideMenu = hideMenu;
    rmenu.showMenu = showMenu;
    rmenu.defaultMenuData = defaultMenu;
})(jQuery);
