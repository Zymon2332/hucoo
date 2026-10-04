package dev.hucoo.component.storage.memory;

import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageClientContract;

class InMemoryStorageClientContractTest extends StorageClientContract {

    private final InMemoryStorageClient client = new InMemoryStorageClient();

    @Override
    protected StorageClient client() {
        return client;
    }
}
