import { errorDisplayMessage } from "@t3tools/client-runtime/errors";
import { msg } from "gt-react-native";

import { m } from "../../i18n/messages";
import {
  downloadAppRelease,
  findAppReleaseUpdate,
  openAppReleaseInstaller,
  type AppReleaseUpdate,
} from "./app-release";

const CHECK_TIMEOUT_MS = 20_000;

export type AppUpdateState =
  | { readonly status: "idle" }
  | { readonly status: "checking" }
  | { readonly status: "current" }
  | { readonly status: "available"; readonly update: AppReleaseUpdate }
  | {
      readonly status: "downloading";
      readonly update: AppReleaseUpdate;
      readonly fraction: number | undefined;
    }
  | { readonly status: "installing"; readonly update: AppReleaseUpdate }
  | { readonly status: "ready"; readonly update: AppReleaseUpdate; readonly uri: string }
  | {
      readonly status: "failed";
      readonly update: AppReleaseUpdate | null;
      readonly message: string;
      readonly uri?: string;
    };

function failureMessage(cause: unknown, fallback: string): string {
  const message = errorDisplayMessage(cause, m);
  return message !== null && message.trim().length > 0 ? message : fallback;
}

/**
 * Runs the release check and the APK download outside React so the compiler does not have to
 * lower `try/finally` inside the render function. One operation runs at a time, and `dispose`
 * stops whatever About left in flight.
 */
export class AppReleaseController {
  private abortController: AbortController | null = null;
  private operationInFlight = false;

  constructor(private readonly setState: (state: AppUpdateState) => void) {}

  dispose(): void {
    this.abortController?.abort();
  }

  async check(currentVersion: string): Promise<void> {
    if (this.operationInFlight) return;
    this.operationInFlight = true;
    const controller = this.beginOperation();
    this.setState({ status: "checking" });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CHECK_TIMEOUT_MS);
    try {
      const update = await findAppReleaseUpdate(currentVersion, controller.signal);
      if (controller.signal.aborted) return;
      this.setState(update ? { status: "available", update } : { status: "current" });
    } catch (cause) {
      if (controller.signal.aborted && !timedOut) return;
      this.setState({
        status: "failed",
        update: null,
        message: timedOut
          ? m(msg("Checking for updates timed out. Try again."))
          : failureMessage(cause, m(msg("Could not check for updates."))),
      });
    } finally {
      clearTimeout(timeout);
      this.operationInFlight = false;
      this.endOperation(controller);
    }
  }

  async downloadAndInstall(update: AppReleaseUpdate): Promise<void> {
    if (this.operationInFlight) return;
    this.operationInFlight = true;
    const controller = this.beginOperation();
    this.setState({ status: "downloading", update, fraction: undefined });
    let uri: string | undefined;
    try {
      uri = await downloadAppRelease({
        release: update,
        signal: controller.signal,
        onProgress: ({ fraction }) => {
          if (!controller.signal.aborted) {
            this.setState({ status: "downloading", update, fraction });
          }
        },
      });
      if (controller.signal.aborted) return;
      this.setState({ status: "installing", update });
      await openAppReleaseInstaller(uri);
      if (!controller.signal.aborted) this.setState({ status: "ready", update, uri });
    } catch (cause) {
      if (controller.signal.aborted) return;
      this.setState({
        status: "failed",
        update,
        message: failureMessage(cause, m(msg("Could not download the update."))),
        ...(uri === undefined ? {} : { uri }),
      });
    } finally {
      this.operationInFlight = false;
      this.endOperation(controller);
    }
  }

  async openInstaller(update: AppReleaseUpdate, uri: string): Promise<void> {
    if (this.operationInFlight) return;
    this.operationInFlight = true;
    const controller = this.beginOperation();
    this.setState({ status: "installing", update });
    try {
      await openAppReleaseInstaller(uri);
      if (!controller.signal.aborted) this.setState({ status: "ready", update, uri });
    } catch (cause) {
      if (controller.signal.aborted) return;
      this.setState({
        status: "failed",
        update,
        message: failureMessage(cause, m(msg("Could not open the Android installer."))),
        uri,
      });
    } finally {
      this.operationInFlight = false;
      this.endOperation(controller);
    }
  }

  private beginOperation(): AbortController {
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    return controller;
  }

  private endOperation(controller: AbortController): void {
    if (this.abortController === controller) this.abortController = null;
  }
}
