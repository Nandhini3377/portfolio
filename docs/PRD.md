# Product Requirements Document (PRD)
## Offline AI Portfolio Builder

**Version:** 1.0  
**Status:** MVP Specification  
**Product Type:** Web Application  
**AI Execution:** Local SLM only

> Decisions that refine or override parts of this PRD are recorded in [DECISIONS.md](DECISIONS.md).

## 1. Product Overview

The Offline AI Portfolio Builder is a web application that enables users to create, customize, preview, and publish personal portfolio websites through a conversational AI interface.

The application uses a small language model (SLM) downloaded and executed locally on the user's device. Users describe the changes they want in natural language, review the generated modifications, and approve them before updating their portfolio.

Users can connect their GitHub and Vercel accounts directly through the application to push approved code changes and deploy their portfolio.

## 2. Product Goals

- Enable users to build professional portfolios without manually writing code.
- Provide a conversational interface for portfolio creation and customization.
- Run AI inference locally without sending prompts or source code to a cloud AI model.
- Allow users to preview and approve changes before applying them.
- Integrate GitHub and Vercel for repository management and deployment.
- Support resource-constrained devices as far as browser and hardware capabilities permit.

## 3. Target Users

- Developers and software engineers.
- Students and fresh graduates.
- Job seekers who need a professional portfolio.
- Designers and other professionals who want a personal portfolio website.

## 4. Core User Workflow

1. The user opens the application.
2. The application checks browser compatibility and device capabilities.
3. The application prompts the user to download the SLM.
4. The user downloads the model and waits for initialization.
5. The user selects a starter template or describes the portfolio they want.
6. The user requests changes through the chat interface.
7. The local SLM interprets the request and proposes structured changes.
8. The application applies the proposed changes to a draft and displays a live preview.
9. The user reviews, approves, rejects, or revises the changes.
10. The user connects their GitHub account and selects or creates a repository.
11. The application pushes approved portfolio files to GitHub.
12. The user connects their Vercel account and configures a deployment.
13. The application triggers deployment and displays the published portfolio URL.

## 5. Functional Requirements

### 5.1 Initial Setup and SLM Download

- Prompt first-time users to download the SLM before enabling AI-powered editing.
- Display model size, download progress, download status, and errors.
- Allow users to retry interrupted or failed downloads.
- Cache model files locally where browser storage permits.
- Reuse the downloaded model on subsequent visits when the cached files remain available.
- Display model initialization and readiness status.
- Check browser compatibility and available device capabilities.
- Provide clear guidance when the device cannot run the selected model reliably.
- Allow users to remove cached model files to free storage.

### 5.2 Chat-Based Portfolio Editor

- Provide a chat interface for creating and customizing portfolios.
- Support natural-language requests, including:
  - Change the theme to dark mode.
  - Add a projects section.
  - Update my introduction.
  - Change the layout of the home page.
  - Add contact and social links.
  - Make the portfolio responsive.
- Maintain relevant project context across editing requests.
- Use the local SLM to interpret requests and generate structured code modifications.
- Show processing status and errors.
- Prevent unapproved modifications from being committed to the project.

### 5.3 Portfolio Templates and Preview

- Provide a collection of starter portfolio templates.
- Support editing common portfolio sections, including introduction, skills, projects, experience, education, and contact information.
- Provide a live preview of the portfolio.
- Support desktop and mobile preview modes.
- Display proposed changes before applying them.
- Allow users to approve, reject, or revise proposed changes.
- Support undo and recovery from failed modifications.
- Validate generated code before updating the working project.

### 5.4 Local AI Execution

- Run the selected SLM on the user's device through a compatible local inference runtime.
- Do not use a cloud AI model as a fallback.
- Do not send prompts, portfolio source code, or editing context to a cloud AI inference service.
- Limit unnecessary context and output length to reduce memory consumption.
- Use structured editing operations for common changes instead of generating entire files unnecessarily.
- Handle model initialization failures, insufficient memory, unsupported browsers, and interrupted inference.
- Benchmark the model on representative target devices before finalizing the model and runtime.

**Constraint:** Local AI execution depends on browser support, available RAM, CPU/GPU capabilities, model size, and runtime compatibility. The application must not promise that every device can run the model.

### 5.5 GitHub Integration

- Provide a GitHub connection option in the application interface.
- Authenticate users through a secure authorization flow.
- Display accessible repositories and branches.
- Allow users to select an existing repository or create a new one where permissions allow.
- Display changed files and proposed modifications before pushing.
- Require user approval before committing or pushing changes.
- Push approved portfolio files to the selected repository.
- Display commit status, errors, and recovery guidance.
- Request only the permissions required for the chosen workflow.

### 5.6 Vercel Integration

- Provide a Vercel connection option in the application interface.
- Authenticate users through a secure authorization flow.
- Allow users to select an existing Vercel project or configure a new project.
- Support linking the selected GitHub repository to Vercel.
- Configure project settings and build settings where required.
- Trigger deployment through the appropriate integration.
- Display deployment progress, success, and failure status.
- Display the published portfolio URL when deployment succeeds.
- Provide actionable errors for common configuration or build failures.

### 5.7 Settings and Project Management

- Display the downloaded model's status.
- Provide GitHub and Vercel connection status.
- Allow users to disconnect integrations.
- Allow users to manage their current portfolio project.
- Preserve project drafts locally where practical.
- Provide clear warnings when browser storage is unavailable or cleared.

## 6. User Interface Requirements

The application should include the following main screens or interface areas:

1. **Welcome and Setup:** Product introduction, compatibility check, and SLM download prompt.
2. **Portfolio Editor:** Chat interface, project navigation, and live preview.
3. **Change Review:** Proposed file changes with approve and reject actions.
4. **Integrations Settings:** GitHub and Vercel connection and configuration.
5. **Publishing Status:** Repository, commit, deployment status, and published URL.
6. **Model Settings:** Download status, storage information, and model removal.

The interface should be responsive, accessible, and clear for users who do not have coding experience.

## 7. Proposed Technical Architecture

### Frontend
- React *(superseded: SvelteKit — see DECISIONS.md)*
- TypeScript
- Tailwind CSS

### Local AI
- A small, quantized coding-capable SLM.
- A compatible browser inference runtime, such as WebLLM or Transformers.js, depending on the selected model.
- IndexedDB or another suitable browser storage mechanism for caching model files and project data.

### Portfolio Editing
- Structured editing engine.
- Code validation and change review.
- Sandboxed iframe for portfolio previews.
- Versioned drafts and undo support.

### Integrations
- GitHub API for repository operations.
- Vercel API or supported integration flows for deployment.
- A small backend or serverless layer where needed for secure authorization and sensitive token handling. *(superseded: pasted tokens, encrypted client-side — see DECISIONS.md)*

The final model, inference runtime, storage approach, and deployment architecture must be validated through a technical proof of concept.

## 8. Security and Privacy Requirements

- AI inference must remain local to the user's device.
- Prompts and portfolio source code must not be sent to cloud AI services.
- GitHub and Vercel credentials must not be exposed in client-side source code or logs.
- Use secure authorization and appropriately scoped permissions.
- Protect preview execution through sandboxing.
- Validate generated code and restrict potentially dangerous operations.
- Never execute arbitrary model-generated shell commands automatically.
- Provide clear information about the data handled by GitHub and Vercel integrations.

The local-AI guarantee applies to AI inference. GitHub and Vercel operations necessarily communicate with their respective online services.

## 9. Non-Functional Requirements

### Performance
- Display download and inference progress.
- Avoid unnecessary model reloads when cached files can be reused.
- Limit memory usage through context management and constrained outputs.
- Keep the editing interface responsive during inference where possible.

### Reliability
- Recover gracefully from failed downloads and interrupted inference.
- Preserve drafts when practical.
- Validate changes before applying them.
- Provide clear errors for failed commits and deployments.

### Compatibility
- Support compatible modern browsers.
- Define and test a minimum supported device profile.
- Test on representative low-memory devices, including devices with approximately 8 GB of RAM.

### Privacy
- Execute the SLM locally.
- Avoid transmitting prompts and portfolio source code to AI inference providers.
- Clearly distinguish local editing from online publishing operations.

## 10. MVP Scope

### Included
- Personal portfolio websites only.
- Initial SLM download and local inference.
- Chat-based portfolio customization.
- Starter templates.
- Live preview and change approval.
- Structured code edits and undo.
- GitHub account connection and repository push.
- Vercel account connection and deployment.
- Basic error handling and device compatibility checks.

### Excluded
- General-purpose website building.
- Cloud AI fallback.
- Native Android or iOS applications.
- Team collaboration and multi-user editing.
- Arbitrary terminal command execution.
- Advanced autonomous software development.
- Complex backend or full-stack application generation.

## 11. Acceptance Criteria

The MVP will be considered ready for initial release testing when:

- A first-time user is prompted to download the SLM.
- The application shows download progress and handles failures.
- A returning user can reuse the cached model when available.
- A user can create a portfolio from a starter template.
- A user can request edits through chat using local inference only.
- The user can preview, approve, reject, and undo changes.
- Generated modifications are validated before being applied.
- The user can connect GitHub and push approved code to a selected repository.
- The user can connect Vercel and deploy the portfolio.
- The application displays deployment status and the published URL.
- Device limitations and integration failures are communicated clearly.
- Sensitive integration credentials are handled securely.

## 12. Development Phases

**Phase 1: Portfolio Foundation**
- Build the frontend and starter templates.
- Implement the editing interface and live preview.
- Build deterministic editing operations for common portfolio changes.

**Phase 2: Local SLM**
- Evaluate candidate models and browser inference runtimes.
- Implement initial download, caching, and inference.
- Benchmark memory usage and responsiveness.
- Connect natural-language requests to structured editing operations.

**Phase 3: GitHub Integration**
- Implement authorization.
- Add repository and branch selection.
- Implement file review and approved code pushes.

**Phase 4: Vercel Integration**
- Implement authorization and project configuration.
- Link repositories and configure deployments.
- Display deployment status and published URLs.

**Phase 5: Testing and Release**
- Test on supported browsers and representative devices.
- Test security, storage, recovery, and integration failures.
- Fix performance and usability issues before release.

## 13. Key Risks and Mitigations

**Risk: The SLM is too slow or memory-intensive.**  
Mitigation: Benchmark small quantized models, limit context and output, and use deterministic editing for common operations.

**Risk: The model generates invalid code.**  
Mitigation: Use structured modifications, validate code, display diffs, and require approval.

**Risk: Browser storage is cleared or insufficient.**  
Mitigation: Check storage availability, display relevant warnings, and provide a recoverable download flow.

**Risk: Integration credentials are exposed.**  
Mitigation: Use secure authorization, minimal permissions, and appropriate server-side handling for sensitive operations.

**Risk: AI editing works offline but publishing does not.**  
Mitigation: Explain that GitHub and Vercel require an internet connection and show connectivity errors clearly.

## 14. Success Metrics

- Percentage of users who successfully download and initialize the SLM.
- Percentage of users who successfully create a portfolio.
- Percentage of proposed edits accepted by users.
- Rate of invalid or failed code modifications.
- Successful GitHub push rate.
- Successful Vercel deployment rate.
- Median local inference time on supported devices.
- Frequency of memory-related failures.

## 15. Open Technical Decisions

Before implementation, the team must validate:

- The exact SLM and quantization level.
- The compatible browser inference runtime.
- Minimum device and browser requirements.
- Model download size and storage requirements.
- Secure GitHub and Vercel authorization architecture.
- Portfolio template structure and supported editing operations.

**Product principle:** The application should prioritize reliable portfolio editing over unrestricted code generation. Local AI should interpret user intent, while a controlled editing engine handles changes safely and efficiently.
