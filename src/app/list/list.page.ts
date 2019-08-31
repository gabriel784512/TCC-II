import { Component, OnInit } from '@angular/core';
import { Vibration } from '@ionic-native/vibration/ngx';

@Component({
  selector: 'app-list',
  templateUrl: 'list.page.html',
  styleUrls: ['list.page.scss']
})
export class ListPage implements OnInit {
  /*private selectedItem: any;
  private icons = [
    'notifications',
    'volume-high'
  ];*/
  //public items: Array<{ title: string; note: string; icon: string }> = [];
  public Click:boolean = true;
  constructor(private vibration: Vibration) {
    /*for (let i = 1; i <= 11; i++) {
      this.items.push({
        title: 'Item ' + i,
        note: 'This is item #' + i,
        icon: this.icons[Math.floor(Math.random() * this.icons.length)]
      });
    }*/
  }

  vibrate(){
    if(this.Click){
      this.vibration.vibrate(1000);
      setInterval(() => {console.log(this.Click)},3000);
      
    }
  }

  ngOnInit() {
  }
  // add back when alpha.4 is out
  // navigate(item) {
  //   this.router.navigate(['/list', JSON.stringify(item)]);
  // }
}
