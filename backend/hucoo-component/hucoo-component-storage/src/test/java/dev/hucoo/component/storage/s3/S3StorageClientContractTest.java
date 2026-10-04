package dev.hucoo.component.storage.s3;

import java.net.URI;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageClientContract;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * S3 兼容驱动的真实服务端契约测试，默认不执行（需要拉取 RustFS 镜像）。
 *
 * <p>显式运行：
 * <pre>
 * HUCOO_S3_CONTRACT_TEST=true ./mvnw -pl hucoo-component/hucoo-component-storage test
 * </pre>
 */
@Testcontainers(disabledWithoutDocker = true)
@EnabledIfEnvironmentVariable(named = "HUCOO_S3_CONTRACT_TEST", matches = "true")
class S3StorageClientContractTest extends StorageClientContract {

    private static final String ACCESS_KEY = "hucoo-contract-ak";
    private static final String SECRET_KEY = "hucoo-contract-sk";

    @Container
    static final GenericContainer<?> RUSTFS = new GenericContainer<>(DockerImageName.parse("rustfs/rustfs:1.0.1"))
            .withExposedPorts(9000)
            .withEnv("RUSTFS_ACCESS_KEY", ACCESS_KEY)
            .withEnv("RUSTFS_SECRET_KEY", SECRET_KEY)
            .withEnv("RUSTFS_ADDRESS", ":9000")
            .withEnv("RUSTFS_REGION", "us-east-1")
            .withEnv("RUSTFS_OBS_LOGGER_LEVEL", "error")
            .withCommand("/data")
            .waitingFor(Wait.forHttp("/health").forPort(9000).forStatusCode(200));

    private S3StorageClient client;

    @Override
    protected StorageClient client() {
        if (client == null) {
            String endpoint = "http://" + RUSTFS.getHost() + ":" + RUSTFS.getMappedPort(9000);
            S3StorageProperties properties = new S3StorageProperties();
            properties.setEndpoint(endpoint);
            properties.setPublicEndpoint(endpoint);
            properties.setAccessKey(ACCESS_KEY);
            properties.setSecretKey(SECRET_KEY);

            StaticCredentialsProvider credentials = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(ACCESS_KEY, SECRET_KEY));
            S3Configuration configuration = S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .chunkedEncodingEnabled(false)
                    .build();
            S3Client s3Client = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .region(Region.US_EAST_1)
                    .credentialsProvider(credentials)
                    .forcePathStyle(true)
                    .serviceConfiguration(configuration)
                    .build();
            S3Presigner presigner = S3Presigner.builder()
                    .endpointOverride(URI.create(endpoint))
                    .region(Region.US_EAST_1)
                    .credentialsProvider(credentials)
                    .serviceConfiguration(configuration)
                    .build();
            client = new S3StorageClient(s3Client, presigner, properties);
        }
        return client;
    }
}
