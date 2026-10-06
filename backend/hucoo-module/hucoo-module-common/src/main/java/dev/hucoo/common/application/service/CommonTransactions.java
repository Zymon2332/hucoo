package dev.hucoo.common.application.service;

import java.util.function.Supplier;

import org.springframework.transaction.support.TransactionTemplate;

/**
 * Database transactions, or one shared lock for atomic in-memory aggregate mutations.
 */
public class CommonTransactions {
    private final TransactionTemplate transactions;

    public CommonTransactions(TransactionTemplate transactions) {
        this.transactions = transactions;
    }

    public <T> T execute(Supplier<T> operation) {
        if (transactions != null) return transactions.execute(status -> operation.get());
        synchronized (this) {
            return operation.get();
        }
    }
}
