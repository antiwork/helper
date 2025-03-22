#[macro_use]
extern crate lazy_static;

use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::AllocAnyThread;
use objc2::DefinedClass;
use objc2::{define_class, msg_send, MainThreadMarker, MainThreadOnly};
use objc2_authentication_services::{
    ASAuthorization, ASAuthorizationAppleIDProvider, ASAuthorizationController,
    ASAuthorizationControllerDelegate, ASAuthorizationRequest,
};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol};
use std::cell::RefCell;
use std::env;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

lazy_static! {
    static ref DEEP_LINK_URL: Mutex<Option<String>> = Mutex::new(None);
}

thread_local! {
    static APPLE_SIGN_IN_DELEGATE: RefCell<Option<Retained<ASAuthorizationControllerDelegateImpl>>> = RefCell::new(None);
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

#[derive(Clone)]
struct Ivars {
    app: AppHandle,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[name = "ASAuthorizationControllerDelegateImpl"]
    #[ivars = Ivars]
    struct ASAuthorizationControllerDelegateImpl;

    unsafe impl NSObjectProtocol for ASAuthorizationControllerDelegateImpl {}
);

impl ASAuthorizationControllerDelegateImpl {
    fn new(app: AppHandle) -> Retained<Self> {
        let mtm = MainThreadMarker::new().unwrap();
        let this = Self::alloc(mtm).set_ivars(Ivars { app });
        unsafe { msg_send![super(this), init] }
    }
}

unsafe impl ASAuthorizationControllerDelegate for ASAuthorizationControllerDelegateImpl {
    unsafe fn authorizationController_didCompleteWithAuthorization(
        &self,
        _controller: &ASAuthorizationController,
        authorization: &ASAuthorization,
    ) {
        log::info!("Authorization complete: {:?}", authorization);
        self.ivars()
            .app
            .emit("apple-sign-in-complete", format!("{:?}", authorization))
            .unwrap();
    }

    unsafe fn authorizationController_didCompleteWithError(
        &self,
        _controller: &ASAuthorizationController,
        error: &NSError,
    ) {
        log::error!("Authorization error: {:?}", error);
        self.ivars()
            .app
            .emit("apple-sign-in-error", format!("{:?}", error))
            .unwrap();
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn start_apple_sign_in(app: AppHandle) {
    unsafe {
        let provider = ASAuthorizationAppleIDProvider::new();
        let request = provider.createRequest();

        let auth_request = &request as &ASAuthorizationRequest;

        let controller = ASAuthorizationController::initWithAuthorizationRequests(
            ASAuthorizationController::alloc(),
            &*NSArray::from_slice(&[auth_request]),
        );

        // Create and store the delegate in thread-local storage to keep it alive
        let delegate = ASAuthorizationControllerDelegateImpl::new(app.clone());
        APPLE_SIGN_IN_DELEGATE.with(|cell| {
            *cell.borrow_mut() = Some(delegate.clone());
        });

        controller.setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
        log::info!("Starting authorization requests");
        controller.performRequests();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_options,
            #[cfg(target_os = "macos")]
            start_apple_sign_in
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
