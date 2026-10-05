package dev.hucoo.modelgovernance.infrastructure.typehandler;

import java.sql.*;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

/** PostgreSQL JSONB 以 OTHER 类型绑定，避免把 JSON 文本作为 VARCHAR 写入。 */
public class PostgresJsonTypeHandler extends BaseTypeHandler<String> {
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, String value, JdbcType jdbcType) throws SQLException {
        ps.setObject(i, value, Types.OTHER);
    }
    @Override public String getNullableResult(ResultSet rs, String column) throws SQLException { return rs.getString(column); }
    @Override public String getNullableResult(ResultSet rs, int column) throws SQLException { return rs.getString(column); }
    @Override public String getNullableResult(CallableStatement cs, int column) throws SQLException { return cs.getString(column); }
}
