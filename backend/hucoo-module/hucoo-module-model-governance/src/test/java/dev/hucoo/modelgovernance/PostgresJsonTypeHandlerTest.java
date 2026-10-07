package dev.hucoo.modelgovernance;

import static org.mockito.Mockito.*;

import java.sql.PreparedStatement;
import java.sql.Types;

import org.junit.jupiter.api.Test;
import org.apache.ibatis.type.JdbcType;
import dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler;

class PostgresJsonTypeHandlerTest {
    @Test
    void bindsJsonbAsDatabaseOtherType() throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        String json = "{\"schemaVersion\":1}";
        new PostgresJsonTypeHandler().setNonNullParameter(statement, 2, json, JdbcType.OTHER);
        verify(statement).setObject(2, json, Types.OTHER);
    }
}
