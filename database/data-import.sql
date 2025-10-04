-- PostgreSQL数据导入文件
-- 健康中心应用数据
-- 生成时间: 2025-09-02T00:32:07.083Z

-- 设置客户端编码
SET client_encoding = 'UTF8';

-- 开始事务
BEGIN;

-- 用户数据
INSERT INTO users (id, username, email, password, role, status, created_at, last_login, preferences) VALUES
('admin-1', 'admin', 'admin@example.com', '$2b$12$.2n6TwSW24c/bd3fivDUK.sU9liI3lJbwC2RTKg8VDTNjQT2aH4Xi', 'admin', 'active', '2025-07-24T15:57:37.572Z', '2025-07-28T04:43:11.407Z', '{"theme":"dark","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1753372657572-uydjcc4uh', 'hugo', 'dajiawa@gmail.com', '$2b$12$/s3hhVrNbIDak.DEnceNKOWPuaIezzsSq.Nm8AsEU1bFzk07TSGye', 'admin', 'active', '2025-07-24T15:57:37.572Z', NULL, '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1753408717107-5x6uioj68', 'chkd@qq.com', 'chkd@qq.com', '$2b$12$R5lVEyi90TUlCUk5ISFBlevhwwYcnJaWcoI.K9r996qdEOWynSG3O', 'admin', 'active', '2025-07-25T01:58:37.107Z', '2025-09-01T05:46:50.806Z', '{"theme":"dark","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.5}'),
('user-1754614898781-9nib3ri5e', '123456@qq.com', '123456@qq.com', '$2b$12$ufzolKQg4aeK2ciFIcJ.GuJOAwsDRGKjCD.9dEncsPQOVol01zQIy', 'user', 'active', '2025-08-08T01:01:38.781Z', '2025-08-08T04:24:18.275Z', '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1754808143187-ssa9mj456', 'admin11', '11@qq.com', '$2b$12$jkTZMgvRd0YKD0nEE0nNpusiwq9ryOKEKH7O83255huJVaLEdW0DO', 'user', 'active', '2025-08-10T06:42:23.187Z', '2025-08-10T09:18:07.246Z', '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1755265957343-kocegxxzh', 'huyinghao', 'hu@qq.com', '$2b$12$Gum9N10lZ0/OU/pJwJrCAumYKuj1AvdQ2GA6iRJOsQn/bcWJ0tRmG', 'user', 'active', '2025-08-15T13:52:37.343Z', '2025-08-15T13:53:27.056Z', '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1755875438988-z1kre63cr', 'huyinghao1', '1231@qq.com', '$2b$12$8xxwpDJ0uGMtx7nOeOwejOmBOaRGXvQ.7PSgqwW7Mvn6BE07UL5Ci', 'user', 'active', '2025-08-22T15:10:38.988Z', '2025-08-22T15:10:53.974Z', '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}'),
('user-1755924869586-kakckdw9w', 'xhtsg', '12345678@qq.com', '$2b$12$lRmawToXgQRpKbpz.PJf/eJOjsRrQ/IouqELwLlaUbW7pNGaiW/n6', 'user', 'active', '2025-08-23T04:54:29.586Z', '2025-08-23T04:54:40.317Z', '{"theme":"light","autoplay":false,"defaultPlaybackRate":1,"defaultVolume":0.8}');

-- 分类数据
INSERT INTO categories (id, name, description, color, icon, created_at, updated_at) VALUES
('cardiology', '心血管', '心血管疾病相关内容', '#b4ecf4', '📝', '2025-07-28T02:55:55.081Z', '2025-08-03T02:35:49.010Z'),
('neurology', '神经外科', '神经系统疾病相关内容', '#8b5cf6', '🧠', '2025-07-28T02:55:55.081Z', '2025-08-08T16:17:27.966Z'),
('internal-medicine', '消化内科', '内科疾病相关内容', '#10b981', '🏥', '2025-07-28T02:55:55.081Z', '2025-08-08T16:17:20.639Z'),
('surgery', '神经内科', '外科手术相关内容', '#f59e0b', '🔬', '2025-07-28T02:55:55.081Z', '2025-08-08T16:17:07.443Z'),
('pediatrics', '儿科', '儿童疾病相关内容', '#3b82f6', '👶', '2025-07-28T02:55:55.081Z', '2025-07-28T02:55:55.081Z'),
('other', '风湿免疫学', '其他医学相关内容', '#6b7280', '📚', '2025-07-28T02:55:55.081Z', '2025-08-08T16:17:44.591Z'),
('category-1753671972572', '护理学', '', '#3262c3', '📂', '2025-07-28T03:06:12.572Z', '2025-07-28T03:06:12.572Z'),
('category-1754327289580', '血液科', '', '#6b7280', '❤️', '2025-08-04T17:08:09.581Z', '2025-08-04T17:08:09.581Z'),
('category-1754327311489', '呼吸与危重症医学科', '', '#6b7280', '🫁', '2025-08-04T17:08:31.489Z', '2025-08-04T17:08:31.489Z'),
('category-1754669700070', '医院管理', '', '#6b7280', '📂', '2025-08-08T16:15:00.070Z', '2025-08-08T16:15:00.070Z');

-- 问题数据
INSERT INTO questions (id, audio_id, user_id, username, title, content, created_at) VALUES
('1753500000001', '1753403550673', 'admin-1', 'admin', '降糖药的作用机制是什么？', '我想了解不同类型降糖药的作用机制，特别是它们如何影响血糖控制和视网膜病变的发展。', '2025-07-26T02:00:00.000Z'),
('1753500000002', '1753403550673', 'user-1753372657572-uydjcc4uh', 'hugo', '糖尿病视网膜病变的早期症状有哪些？', '作为糖尿病患者，我想了解视网膜病变的早期症状，以便及时发现和治疗。', '2025-07-26T02:30:00.000Z');

-- 答案数据
INSERT INTO answers (id, question_id, user_id, username, content, created_at, is_accepted) VALUES
('1753500000101', '1753500000001', 'user-1753372657572-uydjcc4uh', 'hugo', '降糖药主要分为几类：

1. 胰岛素及其类似物：直接补充胰岛素
2. 磺脲类：刺激胰岛β细胞分泌胰岛素
3. 双胍类：主要是二甲双胍，减少肝糖输出
4. α-糖苷酶抑制剂：延缓碳水化合物吸收
5. 胰岛素增敏剂：提高胰岛素敏感性

这些药物通过不同机制控制血糖，从而减少糖尿病并发症的发生。', '2025-07-26T03:00:00.000Z', TRUE),
('1753500000102', '1753500000002', 'admin-1', 'admin', '糖尿病视网膜病变的早期症状包括：

1. 视力模糊或波动
2. 夜间视力下降
3. 看东西有黑点或漂浮物
4. 视野缺损
5. 色觉异常

建议糖尿病患者每年至少进行一次眼底检查，早期发现可以有效预防病情恶化。', '2025-07-26T03:15:00.000Z', FALSE),
('1753499516602', '1753500000002', NULL, 'hugo', '很好', '2025-07-26T03:11:56.602Z', FALSE);

-- 标记数据
INSERT INTO markers (id, audio_id, title, description, time_position, marker_type, created_by, created_at) VALUES
('1753600000101', '1753403550673', '重要统计数据', '糖尿病患者中视网膜病变的发病率统计', 45, 'highlight', 'admin-1', '2025-07-26T06:15:00.000Z'),
('1753600000102', '1753403550673', '胰岛素类似物', '胰岛素类似物的特点和优势', 180, 'note', 'user-1753372657572-uydjcc4uh', '2025-07-26T06:30:00.000Z'),
('1753600000103', '1753403550673', '关键研究结果', 'DCCT研究的重要发现', 360, 'highlight', 'admin-1', '2025-07-26T06:45:00.000Z');

-- 通知数据
INSERT INTO notifications (id, user_id, notification_type, title, message, related_id, related_type, is_read, created_at) VALUES
('1753500000301', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《评论降糖药对糖尿病视网膜病变的影响》已发布', '1753403550673', 'audio', FALSE, '2025-07-26T04:30:00.000Z'),
('1753500000302', 'admin-1', 'new_question', '新问题提出', '用户hugo在《评论降糖药对糖尿病视网膜病变的影响》中提出了新问题', '1753500000002', 'question', TRUE, '2025-07-26T05:00:00.000Z'),
('1753625335084', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《卫生临床护理规范标准发布》已发布', '1753625335077', 'audio', FALSE, '2025-07-27T14:08:55.084Z'),
('1753671523941', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《消化内科基因治疗新进展》已发布', '1753671523939', 'audio', FALSE, '2025-07-28T02:58:43.941Z'),
('1753671523941', 'admin-1', 'new_audio', '新音频发布', '新音频《消化内科基因治疗新进展》已发布', '1753671523939', 'audio', FALSE, '2025-07-28T02:58:43.941Z'),
('1753770623179', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《111》已发布', '1753770623178', 'audio', FALSE, '2025-07-29T06:30:23.179Z'),
('1753770623179', 'admin-1', 'new_audio', '新音频发布', '新音频《111》已发布', '1753770623178', 'audio', FALSE, '2025-07-29T06:30:23.179Z'),
('1755476496456', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《护理标准发展趋势》已发布', '1755476496454', 'audio', FALSE, '2025-08-18T00:21:36.456Z'),
('1755477578176', 'user-1753372657572-uydjcc4uh', 'new_audio', '新音频发布', '新音频《1111111》已发布', '1755477578173', 'audio', FALSE, '2025-08-18T00:39:38.176Z');

-- 提交事务
COMMIT;

-- 更新序列（如果需要）
SELECT setval('audio_resume_states_id_seq', (SELECT COALESCE(MAX(id), 1) FROM audio_resume_states));
SELECT setval('query_performance_id_seq', (SELECT COALESCE(MAX(id), 1) FROM query_performance));