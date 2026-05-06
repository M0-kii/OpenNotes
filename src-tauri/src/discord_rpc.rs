use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use tauri::State;

/// Discord Application ID for OpenNotes.
/// Replace with a real Client ID from https://discord.com/developers/applications
/// before shipping.
const DISCORD_CLIENT_ID: &str = "1359123456789012480";

pub struct DiscordRpcState {
    pub client: Mutex<Option<DiscordIpcClient>>,
}

#[tauri::command]
pub fn update_discord_presence(
    state: State<DiscordRpcState>,
    enabled: bool,
    details: String,
    state_text: String,
) {
    let mut client_lock = state.client.lock().unwrap();

    if !enabled {
        if let Some(client) = client_lock.as_mut() {
            let _ = client.close();
        }
        *client_lock = None;
        return;
    }

    // Create or reuse the client
    if client_lock.is_none() {
        let mut client = DiscordIpcClient::new(DISCORD_CLIENT_ID);
        match client.connect() {
            Ok(_) => {
                *client_lock = Some(client);
            }
            Err(_) => {
                // Discord is likely not running — nothing to do.
                return;
            }
        }
    }

    // Set activity
    if let Some(client) = client_lock.as_mut() {
        let activity = activity::Activity::new()
            .details(&details)
            .state(&state_text)
            .assets(
                activity::Assets::new()
                    .large_image("app_icon")
                    .large_text("OpenNotes"),
            );
        let _ = client.set_activity(activity);
    }
}
