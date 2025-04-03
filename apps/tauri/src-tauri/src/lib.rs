#[macro_use]
extern crate lazy_static;

mod tab_manager;
mod utils;

#[cfg(target_os = "macos")]
mod apple_sign_in;

use std::collections::HashMap;
use std::env;
use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Webview, WebviewBuilder, WebviewUrl,
    WindowBuilder,
};
use tauri_plugin_opener::OpenerExt;

lazy_static! {
    static ref DEEP_LINK_URL: Mutex<Option<String>> = Mutex::new(None);
    static ref TAB_WEBVIEWS: Mutex<HashMap<String, Webview>> = Mutex::new(HashMap::new());
    static ref ACTIVE_TAB: Mutex<Option<String>> = Mutex::new(None);
    static ref NEXT_TAB_ID: Mutex<u32> = Mutex::new(0);
    static ref TAB_TITLES: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
    static ref TAB_ORDER: Mutex<Vec<String>> = Mutex::new(Vec::new());
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

#[tauri::command]
fn add_tab(app: AppHandle, window: tauri::Window, url: String) -> Result<String, String> {
    tab_manager::add_tab(app, window, url)
}

#[tauri::command]
fn set_active_tab(app: AppHandle, tab_id: String) -> Result<(), String> {
    tab_manager::set_active_tab(app, tab_id)
}

#[tauri::command]
fn close_tab(
    app: AppHandle,
    window: tauri::Window,
    tab_id: String,
) -> Result<Option<String>, String> {
    tab_manager::close_tab(app, window, tab_id)
}

#[tauri::command]
fn update_tab(app: AppHandle, tab_id: String, title: String) -> Result<(), String> {
    tab_manager::update_tab(app, tab_id, title)
}

#[tauri::command]
fn reorder_tabs(app: AppHandle, tab_ids: Vec<String>) -> Result<(), String> {
    tab_manager::reorder_tabs(app, tab_ids)
}

#[tauri::command]
fn close_all_tabs(app: AppHandle, window: tauri::Window) -> Result<(), String> {
    tab_manager::close_all_tabs(app, window)
}

#[tauri::command]
fn toggle_tab_context_menu(app: AppHandle, tabs: String) {
    app.emit("tab-context-menu", tabs).unwrap();
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
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_denylist(&["login-popup"])
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_options,
            add_tab,
            set_active_tab,
            close_tab,
            update_tab,
            reorder_tabs,
            close_all_tabs,
            toggle_tab_context_menu,
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
            let mut win_builder = WindowBuilder::new(app, "main")
                .title("Helper")
                .inner_size(1200.0, 800.0);

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
            }

            let window = win_builder.build().unwrap();

            let background_color = utils::get_background_color(&window);
            let _ = window.set_background_color(Some(background_color));

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
                        let _ = app.get_window("main").unwrap().show();
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

            let size = window.inner_size().unwrap();
            let scale_factor = window.scale_factor().unwrap();
            let logical_size: LogicalSize<f32> = size.to_logical(scale_factor);

            let tab_bar_webview = window
                .add_child(
                    WebviewBuilder::new("tab_bar", WebviewUrl::default())
                        .disable_drag_drop_handler()
                        .background_color(background_color),
                    LogicalPosition::new(0., 0.),
                    LogicalSize::new(logical_size.width, logical_size.height),
                )
                .unwrap();

            let window_clone = window.clone();
            window.on_window_event(move |event| match event {
                tauri::WindowEvent::Resized(size) => {
                    let logical_size = size.to_logical(window_clone.scale_factor().unwrap());

                    let tab_webviews = TAB_WEBVIEWS.lock().unwrap();
                    let has_tabs = !tab_webviews.is_empty();

                    if has_tabs {
                        // With tabs: tab bar takes 40px height
                        let _ = tab_bar_webview.set_size(LogicalSize::new(logical_size.width, 40.));

                        for (_, webview) in tab_webviews.iter() {
                            let _ = webview.set_size(LogicalSize::new(
                                logical_size.width,
                                logical_size.height - 40.,
                            ));
                        }
                    } else {
                        // No tabs: tab bar takes full height
                        let _ = tab_bar_webview
                            .set_size(LogicalSize::new(logical_size.width, logical_size.height));
                    }
                }
                _ => {}
            });

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
