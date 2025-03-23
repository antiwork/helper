#[macro_use]
extern crate lazy_static;

#[cfg(target_os = "macos")]
mod apple_sign_in;

use std::env;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

lazy_static! {
    static ref DEEP_LINK_URL: Mutex<Option<String>> = Mutex::new(None);
}

#[tauri::command]
fn start_options() -> serde_json::Value {
    let deep_link = DEEP_LINK_URL.lock().unwrap().clone();

    #[cfg(debug_assertions)]
    let is_dev = true;

    #[cfg(not(debug_assertions))]
    let is_dev = false;

    serde_json::json!({
        "isDev": is_dev,
        "deepLinkUrl": deep_link
    })
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn is_mac_app_store() -> bool {
    use std::path::Path;

    if let Ok(current_exe) = std::env::current_exe() {
        let mut current_dir = current_exe.parent().map(Path::to_path_buf);

        while let Some(dir) = current_dir {
            if dir.to_string_lossy().ends_with(".app") {
                let receipt_path = dir.join("Contents/_MASReceipt/receipt");
                return receipt_path.exists();
            }
            current_dir = dir.parent().map(Path::to_path_buf);
        }
    }

    false
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn is_mac_app_store() -> bool {
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn start_apple_sign_in(app: AppHandle) {
    apple_sign_in::start_apple_sign_in(app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_options,
            is_mac_app_store,
            #[cfg(target_os = "macos")]
            start_apple_sign_in,
        ]);

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .setup(|app| {
            let mut win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Helper")
                .disable_drag_drop_handler()
                .inner_size(1200.0, 800.0);

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
            }

            let window = win_builder.build().unwrap();

            #[cfg(target_os = "macos")]
            {
                // Add a few custom menu items requested by App Store review

                let menu = window.menu().unwrap();
                menu.remove_at(1).unwrap();
                if let Some(window_menu) = menu
                    .get(tauri::menu::WINDOW_SUBMENU_ID)
                    .and_then(|m| m.as_submenu().map(|s| s.to_owned()))
                {
                    let _ = window_menu.prepend(
                        &tauri::menu::MenuItemBuilder::with_id("show_window", "Show Window")
                            .build(app)?,
                    );
                }
                if let Some(item) = menu.get(tauri::menu::HELP_SUBMENU_ID) {
                    let _ = menu.remove(&item);
                }
                let _ = menu.append(
                    &tauri::menu::SubmenuBuilder::new(app, "Help")
                        .text("privacy_policy", "Privacy Policy")
                        .separator()
                        .text("contact_us", "Contact Us")
                        .build()?,
                );

                app.on_menu_event(move |app, event| {
                    if event.id() == "privacy_policy" {
                        let _ = app
                            .opener()
                            .open_url("https://helper.ai/privacy", None::<&str>);
                    } else if event.id() == "contact_us" {
                        let _ = app.opener().open_url("mailto:help@helper.ai", None::<&str>);
                    } else if event.id() == "show_window" {
                        let _ = app.get_webview_window("main").unwrap().show();
                    }
                });

                // Hide the title bar and extend the window content to cover it

                use cocoa::appkit::{
                    NSColor, NSWindow, NSWindowStyleMask, NSWindowTitleVisibility,
                };
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil,
                        40.0 / 255.0,
                        11.0 / 255.0,
                        11.0 / 255.0,
                        1.0,
                    );
                    ns_window.setBackgroundColor_(bg_color);
                    ns_window.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);
                    let style_mask = ns_window.styleMask();
                    ns_window.setStyleMask_(
                        style_mask | NSWindowStyleMask::NSFullSizeContentViewWindowMask,
                    );
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Hide the window instead of closing it, in line with macOS conventions
                #[cfg(target_os = "macos")]
                {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // Show the main window when clicking the dock icon if the app is already running
            #[cfg(any(target_os = "macos"))]
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = event
            {
                if !has_visible_windows {
                    app.get_webview_window("main")
                        .expect("no main window")
                        .show()
                        .unwrap();
                }
            }

            // Handle deep links when starting the app on macOS - this event is triggered before the JS listener is set up
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                log::info!("Received URL from Opened event: {:?}", urls);
                if let Some(url) = urls.first() {
                    let mut deep_link = DEEP_LINK_URL.lock().unwrap();
                    *deep_link = Some(url.to_string());
                }
            }
        });
}
