# Helping Hand Guide Feature

The "Helping Hand" is an interactive guide feature within Helper designed to assist users in completing specific tasks within the application interface. It provides step-by-step instructions overlaid on the UI, guiding the user through workflows like changing settings, creating discounts, or navigating complex pages.

## How it Works

1.  **Initiation**: The guide can be triggered contextually, often initiated by the user or suggested by the AI based on the current conversation or task.
2.  **Planning**: An AI agent generates a "guide plan" based on the user's goal (e.g., "create a discount"). This plan outlines the necessary steps and UI interactions.
3.  **DOM Interaction**: The feature leverages browser APIs to interact with the Document Object Model (DOM). It identifies target UI elements (buttons, input fields, etc.) using selectors or XPath.
4.  **Visual Guidance**: A visual indicator (the "helping hand") highlights the relevant UI element for the current step. The guide provides instructions on what action to take (e.g., "Click this button", "Enter the discount code here").
5.  **Step Execution**: As the user performs the action, the guide verifies the interaction and proceeds to the next step. It can handle form filling, navigation, and other common web interactions.
6.  **Error Handling**: If the user deviates or an unexpected state occurs, the guide attempts to recover or provides feedback.
7.  **Completion**: Once all steps are completed, the guide concludes, confirming the task is finished.

## Key Components

-   **Guide Planning (`lib/ai/guide.ts`)**: Generates the sequence of steps required for a task.
-   **DOM Interaction & Highlighting (`lib/widget/domElements.js`, `lib/widget/guideManager.ts`)**: Manages finding, highlighting, and interacting with UI elements. Includes caching and performance optimizations.
-   **UI Components (`components/widget/ai-steps.tsx`, `components/widget/HelpingHand.tsx`)**: Renders the guide steps and visual elements within the widget.
-   **API Routes (`app/api/v1/guide_sessions/[guideSessionId]/events/route.ts`, `app/api/v1/guide_sessions/route.ts`)**: Handles backend logic for creating guide sessions and tracking events.
-   **Widget Integration (`lib/widget/index.ts`)**: Integrates the guide functionality into the main chat widget. 
