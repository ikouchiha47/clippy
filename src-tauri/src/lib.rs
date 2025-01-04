// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_to_file(data: String, file_name: String) -> Result<(), String> {
    let path = PathBuf::from(file_name);
    fs::write(&path, data).map_err(|err| err.to_string())
}

#[tauri::command]
fn load_from_file(file_name: String) -> Result<String, String> {
    let path = PathBuf::from(file_name);
    fs::read_to_string(&path).map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_to_file, load_from_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
