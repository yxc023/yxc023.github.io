title=springboot 项目 distribution 打包脚本
date=2017-07-24
type=wiki_gradle
status=published
~~~~~~

```java
task(dist, type: Zip, dependsOn: bootRepackage) {
    description = "Bundles the project as a distribution."
    group = "distribution"

    CopySpec binCopySpec = project.copySpec()
    binCopySpec.from("dist/bin")
    binCopySpec.into("bin")
    binCopySpec.setFileMode(0775)


    CopySpec jarChildSpec = project.copySpec();
    jarChildSpec.into("lib");
    jarChildSpec.from(file("$buildDir/libs"))
    jarChildSpec.include("*.jar")
    jarChildSpec.rename(/.*\.jar/, project.name + ".jar")


    CopySpec distCopySpec = project.copySpec();
    distCopySpec.into(TextUtil.minus(archiveName, "." + extension))
    distCopySpec.from("dist")
    distCopySpec.exclude("bin/*")
    distCopySpec.with(jarChildSpec)
    distCopySpec.with(binCopySpec)

    with(distCopySpec)
}

```