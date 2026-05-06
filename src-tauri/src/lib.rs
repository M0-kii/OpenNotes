mod discord_rpc;

use discord_rpc::{update_discord_presence, DiscordRpcState};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(DiscordRpcState {
            client: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![update_discord_presence])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
