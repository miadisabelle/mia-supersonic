  
# Namespace: ExploSupersonicOSC 
session_id__ExploSupersonicOSC_2512102052=01530a36-0d32-4166-a715-19843ca6560f
alias cdExploSupersonicOSC="cd /src/_sessiondata/01530a36-0d32-4166-a715-19843ca6560f && ls -ltra && . session_bash_func_aliases.sh&>/dev/null" 
alias cdPlansExploSupersonicOSC='cd /src/_sessiondata/01530a36-0d32-4166-a715-19843ca6560f/plans 2>/dev/null || echo "No plans directory found."; ls -ltra; echo "Enter plan filename to open:"; read planfile; if [ -f "$planfile" ]; then nano "$planfile"; else echo "File does not exist."; fi' 
session_id__ExploSupersonicOSC_2512102052__MCP_CONFIG="/src/.mcp.lighthouse.json /src/.mcp.iaip.json /src/.mcp.github.miadisabelle.json /src/.mcp.sonic-charts.json"
session_id__ExploSupersonicOSC_2512102052__ADD_DIR="/workspace/common-supersonic-251210 /src/llms"
alias resume_ExploSupersonicOSC="claude --mcp-config $session_id__ExploSupersonicOSC_2512102052__MCP_CONFIG --add-dir $session_id__ExploSupersonicOSC_2512102052__ADD_DIR --resume $session_id__ExploSupersonicOSC_2512102052" 
alias fork_ExploSupersonicOSC="claude --mcp-config $session_id__ExploSupersonicOSC_2512102052__MCP_CONFIG --add-dir $session_id__ExploSupersonicOSC_2512102052__ADD_DIR --resume $session_id__ExploSupersonicOSC_2512102052 --fork-session" 
  
