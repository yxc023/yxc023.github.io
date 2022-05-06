+++
date = "2016-02-09T10:19:32+08:00"
draft = false
title = "mybatis 动态sql记录"
categories = [ "mybatis" ]
type="develop"

+++

使用map传递可变参数

    int updateTaskOrder(@Param("tid") long tid,@Param("oid") long oid,@Param("param") Map<String, Object> param);

<!-- more -->
.

    <update id="updateTaskOrder">
        UPDATE SPD_Task.TaskOrder
        <set>
        <foreach collection="param" item="elem" index="index" separator=",">
            ${index}=#{elem}
        </foreach >
        </set>
        where tid=#{tid} AND oid=#{oid};
    </update>