use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardEntry {
    id: u32,
    content: String,
    timestamp: DateTime<Utc>,
}

pub struct ClipboardState {
    history: Mutex<Vec<ClipboardEntry>>,
    next_id: Mutex<u32>,
}

impl ClipboardState {
    pub fn new() -> Self {
        ClipboardState {
            history: Mutex::new(Vec::new()),
            next_id: Mutex::new(0),
        }
    }
}
