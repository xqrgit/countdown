@echo off
echo 正在启动项目倒计时网页应用...
echo 请不要关闭此窗口，关闭窗口将停止服务器运行。

REM 检查是否安装了Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 使用Python启动HTTP服务器...
    echo 请在浏览器中访问: http://localhost:8000
    python -m http.server 8000
) else (
    REM 如果没有Python，尝试使用Node.js
    node --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用Node.js启动HTTP服务器...
        echo 请先安装http-server: npm install -g http-server
        echo 请在浏览器中访问: http://localhost:8080
        npx http-server -p 8080
    ) else (
        echo 未检测到Python或Node.js。
        echo 请安装Python或Node.js来运行HTTP服务器。
        echo 或者使用其他HTTP服务器软件打开index.html文件。
        pause
    )
) 