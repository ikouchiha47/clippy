#!/bin/bash

PID=$(ps -ef |\
	grep 'bun run tauri dev' |\
	grep -v grep |\
	awk '{print $2}'
)

[[ ! -z "$PID" ]] && pkill "$PID"

bun run tauri dev &
echo "$!"
