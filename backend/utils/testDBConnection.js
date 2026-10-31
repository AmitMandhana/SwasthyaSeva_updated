// Error codes/messages that mean "connected fine but table doesn't exist yet"
const SCHEMA_NOT_INIT_PATTERNS = [
  'schema cache',
  'relation',
  'does not exist',
  'PGRST200',
  'PGRST204',
];

module.exports = async function testDBConnection(supabase) {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      const isSchemaError = SCHEMA_NOT_INIT_PATTERNS.some(p =>
        error.message?.toLowerCase().includes(p.toLowerCase()) ||
        error.code === p
      );
      if (isSchemaError) {
        console.warn("Database reachable but schema not yet initialized. Run DBSetup.sql in Supabase SQL Editor.");
        return true;
      }
      throw error;
    }
    console.log("Database connection successful.");
    return true;
  } catch (err) {
    console.error("Database connection failed:", err.message);
    return false;
  }
};