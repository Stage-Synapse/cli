resource "aws_security_group_rule" "egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 65535
  protocol          = "all"
  cidr_blocks       = [var.remote_user_addr]
  security_group_id = aws_security_group.allow.id
}
