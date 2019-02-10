+++
date = "2016-02-09T04:19:32+08:00"
draft = false
title = "Git中的AutoCRLF与SafeCRLF换行符问题"
categories = [ "git","crlf" ]
type="develop"

+++

和其他人配合开发是有时git会提示关于crlf的警告, 这是因为不同平台换行符不同的问题

CR回车 LF换行

    Windows/Dos CRLF \r\n

    Linux/Unix LF \n

    MacOS CR \r

<!-- more -->



解决方法是：打开命令行，进行设置，如果你是在Windows下开发，建议设置autocrlf为true。

2014/08/20 补充：如果你文件编码是UTF8并且包含中文文字，那还是把autocrlf设置为false，并且把所有文件转换为Linux编码（即LF\n），开启safecrlf检查。

## 说明

一、AutoCRLF

#提交时转换为LF，检出时转换为CRLF

    git config --global core.autocrlf true

#提交时转换为LF，检出时不转换

    git config --global core.autocrlf input

#提交检出均不转换

    git config --global core.autocrlf false





二、SafeCRLF

#拒绝提交包含混合换行符的文件

    git config --global core.safecrlf true

#允许提交包含混合换行符的文件

    git config --global core.safecrlf false

#提交包含混合换行符的文件时给出警告

    git config --global core.safecrlf warn




