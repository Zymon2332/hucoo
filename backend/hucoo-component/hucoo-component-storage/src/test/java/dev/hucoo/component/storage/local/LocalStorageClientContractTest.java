package dev.hucoo.component.storage.local;

import java.nio.file.Path;

import org.junit.jupiter.api.io.TempDir;

import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageClientContract;

class LocalStorageClientContractTest extends StorageClientContract {

    @TempDir
    static Path storageRoot;

    private static LocalStorageClient client;

    @Override
    protected StorageClient client() {
        if (client == null) {
            LocalStorageProperties properties = new LocalStorageProperties();
            properties.setRoot(storageRoot.toString());
            client = new LocalStorageClient(properties);
        }
        return client;
    }
}
