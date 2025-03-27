use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::AllocAnyThread;
use objc2::DefinedClass;
use objc2::{define_class, msg_send, MainThreadMarker, MainThreadOnly};
use objc2_authentication_services::{
    ASAuthorization, ASAuthorizationAppleIDCredential, ASAuthorizationAppleIDProvider,
    ASAuthorizationController, ASAuthorizationControllerDelegate, ASAuthorizationRequest,
    ASAuthorizationScopeEmail, ASAuthorizationScopeFullName,
};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol};
use serde_json;
use std::cell::RefCell;
use tauri::AppHandle;
use tauri::Emitter;

thread_local! {
    static APPLE_SIGN_IN_DELEGATE: RefCell<Option<Retained<ASAuthorizationControllerDelegateImpl>>> = RefCell::new(None);
    static AUTHORIZATION_CONTROLLER: RefCell<Option<Retained<ASAuthorizationController>>> = RefCell::new(None);
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

    unsafe impl ASAuthorizationControllerDelegate for ASAuthorizationControllerDelegateImpl {
        #[unsafe(method(authorizationController:didCompleteWithAuthorization:))]
        #[allow(non_snake_case)]
        unsafe fn authorizationController_didCompleteWithAuthorization(
            &self,
            _controller: &ASAuthorizationController,
            authorization: &ASAuthorization,
        ) {
            let credential = authorization
                .credential()
                .downcast::<ASAuthorizationAppleIDCredential>()
                .unwrap();
            let code = String::from_utf8(credential.authorizationCode().unwrap().to_vec()).unwrap();
            let firstName = credential
                .fullName()
                .map(|name| name.givenName().unwrap_or_default().to_string());
            let lastName = credential
                .fullName()
                .map(|name| name.familyName().unwrap_or_default().to_string());
            self.ivars()
                .app
                .emit(
                    "apple-sign-in-complete",
                    serde_json::json!({
                        "code": code,
                        "firstName": firstName,
                        "lastName": lastName,
                    }),
                )
                .unwrap();
            log::info!("Authorization complete");
        }

        #[unsafe(method(authorizationController:didCompleteWithError:))]
        #[allow(non_snake_case)]
        unsafe fn authorizationController_didCompleteWithError(
            &self,
            _controller: &ASAuthorizationController,
            error: &NSError,
        ) {
            self.ivars()
                .app
                .emit("apple-sign-in-error", error.code())
                .unwrap();
            log::error!("Authorization error: {:?}", error);
        }
    }
);

impl ASAuthorizationControllerDelegateImpl {
    fn new(app: AppHandle) -> Retained<Self> {
        let mtm = MainThreadMarker::new().unwrap();
        let this = Self::alloc(mtm).set_ivars(Ivars { app });
        unsafe { msg_send![super(this), init] }
    }
}

pub fn start_apple_sign_in(app: AppHandle) {
    unsafe {
        let provider = ASAuthorizationAppleIDProvider::new();
        let request = provider.createRequest();
        request.setRequestedScopes(Some(&*NSArray::from_slice(&[
            ASAuthorizationScopeFullName,
            ASAuthorizationScopeEmail,
        ])));

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

        // Store the controller in thread-local storage to keep it alive
        AUTHORIZATION_CONTROLLER.with(|cell| {
            *cell.borrow_mut() = Some(controller.clone());
        });

        controller.setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
        log::info!("Starting authorization requests");
        controller.performRequests();
    }
}
