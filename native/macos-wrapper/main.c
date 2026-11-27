// macOS records a TCC grant (Full Disk Access, Desktop, Documents) against an executable's path
// and signature, and the pinned runtime's path carries its version, so the launch agent lost its
// grants on every update. It starts this stub at a fixed path instead, and the stub stays alive as
// the runtime's parent: tccd keeps checking the grant against this stub as the responsible process.
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

static volatile sig_atomic_t child = -1;

static void forward_signal(int number) {
  const pid_t target = child;
  if (target > 0) kill(target, number);
}

int main(int argc, char *argv[]) {
  if (argc < 2) {
    fprintf(stderr, "usage: t3-wrapper <runtime> [argument ...]\n");
    return 64;
  }

  // Install handlers and block signals before fork so an early stop waits for child assignment
  // instead of killing the wrapper without forwarding the signal.
  struct sigaction forward = {.sa_handler = forward_signal};
  sigemptyset(&forward.sa_mask);
  sigset_t mask;
  sigset_t saved_mask;
  sigemptyset(&mask);
  const int forwarded[] = {SIGTERM, SIGINT, SIGHUP, SIGQUIT};
  for (size_t index = 0; index < sizeof(forwarded) / sizeof(forwarded[0]); index++) {
    sigaction(forwarded[index], &forward, NULL);
    sigaddset(&mask, forwarded[index]);
  }
  sigprocmask(SIG_BLOCK, &mask, &saved_mask);

  const pid_t pid = fork();
  if (pid < 0) {
    sigprocmask(SIG_SETMASK, &saved_mask, NULL);
    perror("t3-wrapper: fork");
    return 71;
  }
  if (pid == 0) {
    sigprocmask(SIG_SETMASK, &saved_mask, NULL);
    execv(argv[1], argv + 1);
    perror("t3-wrapper: exec");
    _exit(127);
  }
  child = pid;
  sigprocmask(SIG_SETMASK, &saved_mask, NULL);

  int status = 0;
  while (waitpid(pid, &status, 0) < 0 && errno == EINTR) {
  }
  child = -1;

  if (WIFSIGNALED(status)) {
    const int number = WTERMSIG(status);
    signal(number, SIG_DFL);
    raise(number);
    return 128 + number;
  }
  return WIFEXITED(status) ? WEXITSTATUS(status) : 70;
}
