@echo off
cd /d "%~dp0"
echo ========================================
echo  闲趣二手 RAG 智能客服服务
echo ========================================
echo.
echo 正在启动服务...
echo 端口: 8899
echo.
python rag_service.py
pause
