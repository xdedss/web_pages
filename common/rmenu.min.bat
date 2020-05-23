@echo off

set a=%0
set a=%a:min.js.bat=js%
set a=%a:min.bat=js%
set a=%a:bat=js%

echo %a%

set m=minify.py

set i=0
:start
if %i%==10 (goto end)

set m=../%m%
if exist %m% (python %m%  %a%)

set /a i+=1
goto start
:end

pause