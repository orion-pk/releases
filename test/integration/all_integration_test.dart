import 'user_access_control/user_access_control_test.dart' as user_access_control;
import 'student_module/student_module_test.dart' as student_module;
import 'teacher_module/teacher_module_test.dart' as teacher_module;
import 'system_admin/system_admin_test.dart' as system_admin;

/// Master Integration Test Runner for Active Implemented Modules
void main() {
  user_access_control.main();
  student_module.main();
  teacher_module.main();
  system_admin.main();
}
