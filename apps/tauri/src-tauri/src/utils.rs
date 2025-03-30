use std::str::FromStr;
use tauri::window::Color;
use tauri::Theme;

pub fn get_background_color(window: &tauri::Window) -> Color {
    if window.theme().unwrap() == Theme::Light {
        Color::from_str("#ffffff").unwrap()
    } else {
        Color::from_str("#280b0b").unwrap()
    }
}
