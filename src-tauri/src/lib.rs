// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// mod clipboard;
//
// use clipboard::{ClipboardEntry, ClipboardState};
//
// #[tauri::command]
// async fn get_clipboard_history(
//     state: State<'_, ClipboardState>,
// ) -> Result<Vec<ClipboardEntry>, String> {
//     let history = state.history.lock().map_err(|e| e.to_string())?;
//     Ok(history.clone())
// }
//
// #[tauri::command]
// async fn add_to_clipboard(
//     content: String,
//     state: State<'_, ClipboardState>,
// ) -> Result<ClipboardEntry, String> {
//     let mut history = state.history.lock().map_err(|e| e.to_string())?;
//     let mut next_id = state.next_id.lock().map_err(|e| e.to_string())?;
//
//     let entry = ClipboardEntry {
//         id: *next_id,
//         content,
//         timestamp: Utc::now(),
//     };
//
//     *next_id += 1;
//     history.push(entry.clone());
//
//     // Keep only last 100 entries
//     if history.len() > 100 {
//         history.remove(0);
//     }
//
//     Ok(entry)
// }

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
