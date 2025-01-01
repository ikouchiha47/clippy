dev:
	bun run tauri dev

build:
	cargo install tauri-cli --version "^2.0.0"
	cargo tauri build --target aarch64-apple-darwin
	cargo tauri build --target x86_64-apple-darwin
	cargo tauri build
