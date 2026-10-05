package dev.hucoo.component.log.context;

import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.Callable;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import io.micrometer.context.ContextSnapshot;
import io.micrometer.context.ContextSnapshotFactory;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;

/**
 * Capture at submission/registration time, never on the completion thread.
 */
public final class TaskContext {
    private final ContextSnapshotFactory snapshots;
    private final ObservationRegistry observations;

    public TaskContext(ContextSnapshotFactory snapshots, ObservationRegistry observations) {
        this.snapshots = snapshots;
        this.observations = observations;
    }

    public CapturedContext capture() {
        return new CapturedContext(snapshots.captureAll());
    }

    public Runnable wrap(Runnable action) {
        return capture().wrap(action);
    }

    public <T> Callable<T> wrapCallable(Callable<T> action) {
        return capture().wrapCallable(action);
    }

    public <T> Supplier<T> wrapSupplier(Supplier<T> action) {
        return capture().wrapSupplier(action);
    }

    public <T, R> Function<T, R> wrapFunction(Function<T, R> action) {
        return capture().wrapFunction(action);
    }

    public <T> Consumer<T> wrapConsumer(Consumer<T> action) {
        return capture().wrapConsumer(action);
    }

    public Runnable task(String name, Runnable action) {
        CapturedContext captured = capture();
        return captured.wrap(() -> Observation.createNotStarted(name, observations).observe(action));
    }

    public Executor wrapExecutor(Executor executor) {
        return action -> executor.execute(task("async.task", action));
    }

    /**
     * The wrapper owns the delegate lifecycle; close/shutdown must be called only by its owner.
     */
    public ExecutorService wrapExecutorService(ExecutorService executor) {
        return new AbstractExecutorService() {
            @Override
            public void execute(Runnable action) {
                executor.execute(task("async.task", action));
            }

            @Override
            public void shutdown() {
                executor.shutdown();
            }

            @Override
            public List<Runnable> shutdownNow() {
                return executor.shutdownNow();
            }

            @Override
            public boolean isShutdown() {
                return executor.isShutdown();
            }

            @Override
            public boolean isTerminated() {
                return executor.isTerminated();
            }

            @Override
            public boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException {
                return executor.awaitTermination(timeout, unit);
            }
        };
    }

    public static final class CapturedContext {
        private final ContextSnapshot snapshot;

        private CapturedContext(ContextSnapshot snapshot) {
            this.snapshot = snapshot;
        }

        public ContextSnapshot.Scope open() {
            return snapshot.setThreadLocals();
        }

        public Runnable wrap(Runnable action) {
            return () -> {
                try (var scope = open()) {
                    action.run();
                }
            };
        }

        public <T> Callable<T> wrapCallable(Callable<T> action) {
            return () -> {
                try (var scope = open()) {
                    return action.call();
                }
            };
        }

        public <T> Supplier<T> wrapSupplier(Supplier<T> action) {
            return () -> {
                try (var scope = open()) {
                    return action.get();
                }
            };
        }

        public <T, R> Function<T, R> wrapFunction(Function<T, R> action) {
            return value -> {
                try (var scope = open()) {
                    return action.apply(value);
                }
            };
        }

        public <T> Consumer<T> wrapConsumer(Consumer<T> action) {
            return value -> {
                try (var scope = open()) {
                    action.accept(value);
                }
            };
        }
    }
}
