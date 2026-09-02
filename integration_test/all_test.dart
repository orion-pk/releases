import 'superadmin/superadmin_suite.dart' as superadmin_suite;
import 'parent/parent_suite.dart' as parent_suite;

/// Academy Master Integration Testing Entrypoint
void main() {
  superadmin_suite.main();
  parent_suite.main();
}
